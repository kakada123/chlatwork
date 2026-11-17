import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import * as vue from "vue";
import * as icons from "lucide-vue-next";
import { compileScript, parse } from "@vue/compiler-sfc";
import ts from "../api/node_modules/typescript/lib/typescript.js";
import * as attachments from "../app/lib/prephub-attachments.ts";
import { createI18nStub } from "./helpers/i18n-stubs.ts";
import {
  PDFDocument,
  PDFName,
  concatTransformationMatrix,
  drawObject,
  pushGraphicsState,
  popGraphicsState,
} from "pdf-lib";

function load(
  name: string,
  options: { fetch?: any; engine?: any; cleanup?: (() => void)[] } = {},
) {
  const filename = `app/components/prephub/${name}.vue`;
  const { descriptor, errors } = parse(readFileSync(filename, "utf8"), {
    filename,
  });
  assert.deepEqual(errors, []);
  const code = ts.transpileModule(
    compileScript(descriptor, { id: name }).content,
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const globals = {
    ...vue,
    onMounted() {},
    onBeforeUnmount: (callback: () => void) => options.cleanup?.push(callback),
    useAppI18n: createI18nStub,
    fetch: options.fetch,
    window: { devicePixelRatio: 1, matchMedia: () => ({ matches: false }) },
  };
  const module = { exports: {} as any };
  new Function("require", "module", "exports", ...Object.keys(globals), code)(
    (path: string) =>
      path === "vue"
        ? vue
        : path === "lucide-vue-next"
          ? icons
          : path === "~/lib/prephub-attachments"
            ? attachments
            : path === "pdfjs-dist"
              ? options.engine
              : path.endsWith("?url")
                ? { __esModule: true, default: "/worker.mjs" }
                : {},
    module,
    module.exports,
    ...Object.values(globals),
  );
  return module.exports.default;
}
function setup(
  name: string,
  props: any,
  options: Parameters<typeof load>[1] = {},
  emit = (..._: any[]) => {},
) {
  return load(name, options).setup(props, { expose() {}, emit });
}
const resource = (id: string, mimeType = "image/png") => ({
  id,
  title: id,
  mimeType,
  extension: "png",
  fileSize: 5,
});
test("viewer navigation stays bounded, ignores stale image events and closes when its subject changes", async () => {
  const props = vue.reactive({
    resources: [
      resource("one"),
      resource("two"),
      resource("pdf", "application/pdf"),
    ],
    initialId: "two",
    subjectId: "subject",
  });
  const emitted: string[] = [];
  const viewer = setup("PrepAttachmentViewer", props, {}, (name: string) =>
    emitted.push(name),
  );
  viewer.move(1);
  assert.equal(viewer.activeId.value, "pdf");
  viewer.move(1);
  assert.equal(viewer.activeId.value, "pdf");
  viewer.move(-1);
  await vue.nextTick();
  viewer.imageLoaded({
    currentTarget: { dataset: { resourceId: "one", previewVersion: "0" } },
  });
  assert.equal(viewer.loading.value, true);
  viewer.imageLoaded({
    currentTarget: { dataset: { resourceId: "two", previewVersion: "0" } },
  });
  assert.equal(viewer.loading.value, false);
  viewer.imageVersion.value = 2;
  viewer.loading.value = true;
  viewer.imageLoaded(
    { currentTarget: { dataset: { resourceId: "two", previewVersion: "1" } } },
    true,
  );
  assert.equal(viewer.loading.value, true);
  assert.equal(viewer.imageFailed.value, false);
  props.resources = [resource("one")];
  await vue.nextTick();
  assert.equal(viewer.activeId.value, "one");
  props.subjectId = "another";
  await vue.nextTick();
  assert.deepEqual(emitted, ["close"]);
});

test("viewer keyboard navigation skips form fields and uses the capability URL for downloads", () => {
  const viewer = setup("PrepAttachmentViewer", {
    resources: [resource("one"), resource("two")],
    initialId: "one",
    subjectId: "subject",
    resourceBase: "/api/prephub/public/token/resources",
  });
  let prevented = false;
  viewer.keydown({
    key: "ArrowRight",
    target: { closest: () => true },
    preventDefault() {
      prevented = true;
    },
  });
  assert.equal(viewer.activeId.value, "one");
  viewer.keydown({
    key: "ArrowRight",
    target: { closest: () => null },
    preventDefault() {
      prevented = true;
    },
  });
  assert.equal(viewer.activeId.value, "two");
  assert.equal(prevented, true);
  assert.equal(
    viewer.url(resource("two")),
    "/api/prephub/public/token/resources/two",
  );
});

const response = () =>
  new Response(new Uint8Array([37, 80, 68, 70]), {
    headers: { "content-type": "application/pdf" },
  });
function fakeDocument(
  render = () => ({ promise: Promise.resolve(), cancel() {} }),
) {
  return {
    numPages: 3,
    getPage: async () => ({
      getViewport: ({ scale }: { scale: number }) => ({
        width: 600 * scale,
        height: 800 * scale,
      }),
      render,
    }),
  };
}
function canvas(preview: any) {
  preview.canvas.value = {
    style: {},
    width: 0,
    height: 0,
    getContext: () => ({}),
  };
  preview.host.value = { clientWidth: 800 };
}
test("PDF preview ignores superseded fetches and destroys its loading task on close", async () => {
  const pending: ((value: Response) => void)[] = [];
  const requests: any[] = [],
    cleanup: (() => void)[] = [];
  let destroyed = 0,
    loaded = 0;
  const engine = {
    GlobalWorkerOptions: {},
    getDocument: () => {
      loaded++;
      return {
        promise: Promise.resolve(fakeDocument()),
        destroy: async () => {
          destroyed++;
        },
      };
    },
  };
  const preview = setup(
    "PrepPdfPreview",
    { url: "/api/prephub/subjects/subject/resources/pdf?preview=1" },
    {
      engine,
      cleanup,
      fetch: (_url: string, options: any) => {
        requests.push(options);
        return new Promise((resolve) => pending.push(resolve));
      },
    },
  );
  canvas(preview);
  const old = preview.load();
  await new Promise((resolve) => setImmediate(resolve));
  const current = preview.load();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(requests[0].signal.aborted, true);
  pending[1](response());
  await current;
  pending[0](response());
  await old;
  assert.equal(loaded, 1);
  assert.equal(preview.pdf.value.numPages, 3);
  assert.equal(preview.failed.value, false);
  assert.equal(requests[1].credentials, "same-origin");
  assert.equal(requests[1].cache, "no-store");
  cleanup[0]();
  assert.equal(requests[1].signal.aborted, true);
  assert.equal(destroyed, 1);
  assert.equal(preview.pdf.value, null);
});

test("PDF rendering waits for a canceled render before reusing its canvas", async () => {
  const calls: string[] = [];
  let rejectFirst: (error: Error) => void = () => {};
  const first = new Promise<void>((_resolve, reject) => {
    rejectFirst = reject;
  });
  let renders = 0;
  const document = fakeDocument(() => {
    const number = ++renders;
    calls.push(`render${number}`);
    return {
      promise: number === 1 ? first : Promise.resolve(),
      cancel() {
        calls.push(`cancel${number}`);
        queueMicrotask(() => {
          calls.push(`settled${number}`);
          rejectFirst(
            Object.assign(new Error("Canceled"), {
              name: "RenderingCancelledException",
            }),
          );
        });
      },
    };
  });
  const preview = setup(
    "PrepPdfPreview",
    { url: "/pdf" },
    {
      engine: {
        GlobalWorkerOptions: {},
        getDocument: () => ({
          promise: Promise.resolve(document),
          destroy: async () => {},
        }),
      },
      fetch: async () => response(),
    },
  );
  canvas(preview);
  const loading = preview.load();
  for (let attempt = 0; !renders && attempt < 20; attempt++)
    await new Promise((resolve) => setImmediate(resolve));
  assert.equal(renders, 1);
  await preview.draw();
  await loading;
  assert.deepEqual(calls, ["render1", "cancel1", "settled1", "render2"]);
  assert.equal(preview.failed.value, false);
  assert.equal(preview.rendering.value, false);
});

test("non-PDF and malformed responses show a recoverable preview error", async () => {
  const preview = setup(
    "PrepPdfPreview",
    { url: "/pdf" },
    {
      fetch: async () =>
        new Response("Sign in", { headers: { "content-type": "text/html" } }),
    },
  );
  await preview.load();
  assert.equal(preview.failed.value, true);
  assert.equal(preview.loading.value, false);
  assert.equal(preview.pdf.value, null);
});

test("password-protected PDFs stop loading and release their worker instead of waiting for a prompt", async () => {
  let reject: (error: Error) => void = () => {};
  let destroyed = 0;
  const task = {
    onPassword: () => {},
    promise: new Promise((_resolve, rejectPromise) => {
      reject = rejectPromise;
    }),
    destroy: async () => {
      destroyed++;
      reject(new Error("Password protected"));
    },
  };
  const preview = setup(
    "PrepPdfPreview",
    { url: "/pdf" },
    {
      fetch: async () => response(),
      engine: {
        GlobalWorkerOptions: {},
        getDocument() {
          queueMicrotask(() => task.onPassword());
          return task;
        },
      },
    },
  );
  await preview.load();
  assert.equal(preview.failed.value, true);
  assert.equal(preview.loading.value, false);
  assert.equal(destroyed, 1);
});

test("PDF viewer options preserve a normal high-resolution scanned page", async (context) => {
  let options: any;
  const preview = setup(
    "PrepPdfPreview",
    { url: "/pdf" },
    {
      fetch: async () => response(),
      engine: {
        GlobalWorkerOptions: {},
        getDocument(value: any) {
          options = value;
          return {
            promise: Promise.resolve(fakeDocument()),
            destroy: async () => {},
          };
        },
      },
    },
  );
  canvas(preview);
  await preview.load();
  // Operator-list parsing needs no canvas; this browser-only constructor is not used by the parser.
  const previous = Object.getOwnPropertyDescriptor(globalThis, "DOMMatrix");
  Object.defineProperty(globalThis, "DOMMatrix", {
    configurable: true,
    value: class {},
  });
  context.after(() => {
    if (previous) Object.defineProperty(globalThis, "DOMMatrix", previous);
    else Reflect.deleteProperty(globalThis, "DOMMatrix");
  });
  const engine = await import("pdfjs-dist/legacy/build/pdf.mjs");
  engine.GlobalWorkerOptions.workerSrc = new URL(
    "../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
    import.meta.url,
  ).href;
  const fixture = await PDFDocument.create();
  const page = fixture.addPage([600, 800]);
  const scan = fixture.context.flateStream(
    new Uint8Array(2480 * 3508 * 3).fill(128),
    {
      Type: "XObject",
      Subtype: "Image",
      Width: 2480,
      Height: 3508,
      ColorSpace: "DeviceRGB",
      BitsPerComponent: 8,
    },
  );
  page.node.setXObject(PDFName.of("Scan"), fixture.context.register(scan));
  page.pushOperators(
    pushGraphicsState(),
    concatTransformationMatrix(600, 0, 0, 800, 0, 0),
    drawObject("Scan"),
    popGraphicsState(),
  );
  const task = engine.getDocument({ ...options, data: await fixture.save() });
  try {
    const pdf = await task.promise;
    const operators = await (await pdf.getPage(1)).getOperatorList();
    assert.ok(
      operators.fnArray.includes(engine.OPS.paintImageXObject),
      "The scanned page must remain in the rendered content",
    );
  } finally {
    await task.destroy();
  }
});
