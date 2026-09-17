import { Logger } from '@nestjs/common';
import { transcribeWithGemini } from './creator-gemini-transcription';
import { CreatorProviderError } from './creator-ai-gateway.service';

// Mock the @google/genai SDK so tests never make real network calls.
const mockDelete = jest.fn().mockResolvedValue({});
const mockCreate = jest.fn();
const mockUpload = jest.fn();

// ApiError is used for HTTP-level Gemini API failures.
class MockApiError extends Error {
  constructor(readonly status: number) {
    super(`API error ${status}`);
    this.name = 'ApiError';
  }
}

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    files: {
      upload: mockUpload,
      delete: mockDelete,
    },
    interactions: {
      create: mockCreate,
    },
  })),
  // Expose ApiError so classifyGeminiError instanceof checks work.
  ApiError: MockApiError,
}));


const khmer = 'សួស្តីអ្នកទាំងអស់គ្នា។';
const segments = [{ start: 0, end: 3.5, text: khmer }];
const validResponse = { text: khmer, segments };
const validOutputText = JSON.stringify(validResponse);

function successInteraction(outputText: string) {
  return { output_text: outputText };
}

function successUpload(name = 'files/test-123', uri = 'https://files.example/test-123') {
  return { name, uri, mimeType: 'audio/mp3' };
}

describe('Creator Gemini transcription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpload.mockResolvedValue(successUpload());
    mockCreate.mockResolvedValue(successInteraction(validOutputText));
    mockDelete.mockResolvedValue({});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());


  it('returns a valid CreatorTranscript with GEMINI provider usage', async () => {
    const result = await transcribeWithGemini(
      'test-api-key',
      'gemini-3.5-transcribe',
      '/mock/audio.mp3',
      'audio/mp3',
      10,
      'KHMER',
      0.02,
    );

    expect(result.data.text).toBe(khmer);
    expect(result.data.segments).toEqual(segments);
    expect(result.usage.provider).toBe('GEMINI');
    expect(result.usage.model).toBe('gemini-3.5-transcribe');
    expect(result.usage.audioSeconds).toBe(10); // Math.ceil(10)
    expect(result.usage.estimatedProviderCostUsd).toBeCloseTo((10 / 60) * 0.02);
    expect(result.usage.providerRequestId).toBe('files/test-123');
  });

  it('passes the Khmer language code for KHMER language', async () => {
    await transcribeWithGemini('key', 'gemini-3.5-transcribe', '/p', 'audio/mp3', 5, 'KHMER', 0);
    const call = mockCreate.mock.calls[0][0];
    expect(call.generation_config.transcription_config.language_codes).toEqual(['km']);
  });

  it('passes the Khmer language code for KHMER_ENGLISH language', async () => {
    await transcribeWithGemini('key', 'gemini-3.5-transcribe', '/p', 'audio/mp3', 5, 'KHMER_ENGLISH', 0);
    const call = mockCreate.mock.calls[0][0];
    expect(call.generation_config.transcription_config.language_codes).toEqual(['km']);
  });

  it('omits language code for ENGLISH language (auto-detection)', async () => {
    mockCreate.mockResolvedValueOnce(
      successInteraction(JSON.stringify({ text: 'Hello', segments: [{ start: 0, end: 2, text: 'Hello' }] })),
    );
    await transcribeWithGemini('key', 'gemini-3.5-transcribe', '/p', 'audio/mp3', 2, 'ENGLISH', 0);
    const call = mockCreate.mock.calls[0][0];
    expect(call.generation_config.transcription_config.language_codes).toBeUndefined();
  });

  it('uses verbatim transcription mode to preserve timestamp accuracy', async () => {
    await transcribeWithGemini('key', 'gemini-3.5-transcribe', '/p', 'audio/mp3', 5, 'KHMER', 0);
    const call = mockCreate.mock.calls[0][0];
    expect(call.generation_config.transcription_config.mode).toBe('verbatim');
  });

  it('includes a JSON response_format schema in the interaction request', async () => {
    await transcribeWithGemini('key', 'gemini-3.5-transcribe', '/p', 'audio/mp3', 5, 'KHMER', 0);
    const call = mockCreate.mock.calls[0][0];
    expect(call.response_format).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ mime_type: 'application/json' }),
      ]),
    );
  });

  it('always deletes the uploaded file after a successful transcription', async () => {
    await transcribeWithGemini('key', 'gemini-3.5-transcribe', '/p', 'audio/mp3', 5, 'KHMER', 0);
    expect(mockDelete).toHaveBeenCalledWith({ name: 'files/test-123' });
  });

  it('always deletes the uploaded file even when transcription fails', async () => {
    mockCreate.mockRejectedValueOnce(new Error('provider error'));
    await expect(
      transcribeWithGemini('key', 'gemini-3.5-transcribe', '/p', 'audio/mp3', 5, 'KHMER', 0),
    ).rejects.toThrow(CreatorProviderError);
    expect(mockDelete).toHaveBeenCalledWith({ name: 'files/test-123' });
  });

  it('does not attempt to delete when upload itself fails', async () => {
    mockUpload.mockRejectedValueOnce(new Error('upload failed'));
    await expect(
      transcribeWithGemini('key', 'gemini-3.5-transcribe', '/p', 'audio/mp3', 5, 'KHMER', 0),
    ).rejects.toThrow(CreatorProviderError);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('throws CreatorProviderError on network failure', async () => {
    mockCreate.mockRejectedValueOnce(new Error('Network error'));
    await expect(
      transcribeWithGemini('key', 'gemini-3.5-transcribe', '/p', 'audio/mp3', 5, 'KHMER', 0),
    ).rejects.toBeInstanceOf(CreatorProviderError);
  });

  it('throws CreatorProviderError when model returns invalid JSON', async () => {
    mockCreate.mockResolvedValueOnce(successInteraction('not valid json'));
    await expect(
      transcribeWithGemini('key', 'gemini-3.5-transcribe', '/p', 'audio/mp3', 5, 'KHMER', 0),
    ).rejects.toBeInstanceOf(CreatorProviderError);
  });

  it('throws CreatorProviderError when response has empty transcript', async () => {
    mockCreate.mockResolvedValueOnce(
      successInteraction(JSON.stringify({ text: '   ', segments: [{ start: 0, end: 1, text: 'x' }] })),
    );
    await expect(
      transcribeWithGemini('key', 'gemini-3.5-transcribe', '/p', 'audio/mp3', 5, 'KHMER', 0),
    ).rejects.toBeInstanceOf(CreatorProviderError);
  });

  it('throws CreatorProviderError when segments are missing', async () => {
    mockCreate.mockResolvedValueOnce(
      successInteraction(JSON.stringify({ text: khmer, segments: [] })),
    );
    await expect(
      transcribeWithGemini('key', 'gemini-3.5-transcribe', '/p', 'audio/mp3', 5, 'KHMER', 0),
    ).rejects.toBeInstanceOf(CreatorProviderError);
  });

  it('strips markdown code fence from model output before JSON parsing', async () => {
    const fenced = '```json\n' + validOutputText + '\n```';
    mockCreate.mockResolvedValueOnce(successInteraction(fenced));
    const result = await transcribeWithGemini(
      'key', 'gemini-3.5-transcribe', '/p', 'audio/mp3', 5, 'KHMER', 0,
    );
    expect(result.data.text).toBe(khmer);
  });

  it('rounds audioSeconds up to the nearest whole second', async () => {
    const result = await transcribeWithGemini(
      'key', 'gemini-3.5-transcribe', '/p', 'audio/mp3', 9.1, 'KHMER', 0.06,
    );
    expect(result.usage.audioSeconds).toBe(10); // Math.ceil(9.1)
  });

  it('does not propagate file delete errors', async () => {
    mockDelete.mockRejectedValueOnce(new Error('delete failed'));
    // Should resolve normally — delete failure is non-fatal
    await expect(
      transcribeWithGemini('key', 'gemini-3.5-transcribe', '/p', 'audio/mp3', 5, 'KHMER', 0),
    ).resolves.toBeDefined();
  });
});
