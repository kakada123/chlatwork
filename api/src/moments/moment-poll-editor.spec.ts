import { preparePollEdit } from './moment-poll-editor';
const poll = {
  question: 'Lunch?',
  identityMode: 'NAME_REQUIRED',
  nextOptionNumber: 5,
  options: [
    { id: 'option-1', label: 'Rice', imageId: 'image' },
    { id: 'option-4', label: 'Soup' },
  ],
};
it('retains IDs and images on rename, and never recycles deleted option IDs', () => {
  const result = preparePollEdit(
    poll,
    [{ id: 'option-1', label: 'Rice bowl' }, { label: 'Noodles' }],
    ['option-1', 'option-4'],
  );
  expect(result.options).toEqual([
    { id: 'option-1', label: 'Rice bowl', imageId: 'image' },
    { id: 'option-5', label: 'Noodles' },
  ]);
  expect(result.removed).toEqual([{ id: 'option-4', label: 'Soup' }]);
  expect(result.nextOptionNumber).toBe(6);
});
it('rejects a stale editor before producing a mutation', () => {
  expect(() =>
    preparePollEdit(
      poll,
      [{ id: 'option-1', label: 'Rice' }, { label: 'Other' }],
      ['option-1'],
    ),
  ).toThrow('Refresh');
});
