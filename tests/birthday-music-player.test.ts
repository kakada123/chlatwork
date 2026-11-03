import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { compileScript, parse } from "@vue/compiler-sfc";
import { createRenderer, nextTick, ref } from "vue";
import ts from "../api/node_modules/typescript/lib/typescript.js";

const key = "chlatwork.birthday-music-player";
const asUrl = (source: string) => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const playerUrl = asUrl(`export function createBirthdayAudioPlayer(audio, options) {
  const harness = globalThis[Symbol.for('${key}')]; harness.audio = audio; harness.loop = options.loop;
  return {play(src, clip) { harness.plays.push({src, clip}); options.onState(harness.blocked ? 'error' : 'playing'); }, pause() {harness.pauses++; options.onState('paused');}, destroy() {harness.destroyed++;}};
}`);
const catalogUrl = asUrl(`export function useBirthdayAudioCatalog() {return globalThis[Symbol.for('${key}')].catalog;}`);
const audioUrl = asUrl(ts.transpileModule(readFileSync("app/lib/birthday-audio.ts", "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText);
const filename = "app/components/moments/BirthdayMusicPlayer.vue";
const script = compileScript(parse(readFileSync(filename, "utf8"), { filename }).descriptor, { id: filename, inlineTemplate: true }).content;
const source = ts.transpileModule(script, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
  .replace(/from (["'])([^"']+)\1/g, (_, _quote, id) => `from ${JSON.stringify(id === "~/lib/birthday-audio-player" ? playerUrl : id === "~/lib/birthday-audio" ? audioUrl : id === "~/composables/useBirthdayAudioCatalog" ? catalogUrl : import.meta.resolve(id))}`);
const MusicPlayer = (await import(asUrl(source))).default;
class HostNode {
  tag: string; children: HostNode[] = []; parent: HostNode | null = null; props: Record<string, any> = {}; text = ""; volume = 1; muted = false;
  constructor(tag: string) {this.tag = tag;}
  addEventListener() {}
  removeEventListener() {}
  get textContent(): string {return this.text + this.children.map(node => node.textContent).join("");}
}
const renderer = createRenderer<HostNode, HostNode>({
  createElement: tag => new HostNode(tag), createText: text => Object.assign(new HostNode("text"), {text}), createComment: () => new HostNode("comment"),
  insert(child, parent, anchor) {if(child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1); child.parent = parent; const index = anchor ? parent.children.indexOf(anchor) : -1; parent.children.splice(index < 0 ? parent.children.length : index, 0, child);},
  remove(child) {if(child.parent) child.parent.children.splice(child.parent.children.indexOf(child),1); child.parent = null;},
  setText(node,text) {node.text = text;}, setElementText(node,text) {node.text = text;node.children=[];}, patchProp(node,key,_old,value) {node.props[key] = value;}, parentNode: node=>node.parent, nextSibling: node=>node.parent?.children[node.parent.children.indexOf(node)+1] ?? null,
});
const tracks = [{id: "hbd-001", title: "Birthday", durationMs: 10000, src: "/api/moments/birthday-audio/hbd-001"}];
function mount(options: {ready?: boolean; autoPlay?: boolean; blocked?: boolean} = {}) {
  const previous = Object.getOwnPropertyDescriptor(globalThis,"document");
  const documentRoot = Object.assign(new EventTarget(), {hidden:false});
  Object.defineProperty(globalThis,"document",{configurable:true,value:documentRoot});
  const harness = {plays:[] as any[], pauses:0, destroyed:0, audio:null as any, loop:false, blocked:options.blocked ?? false, catalog:{tracks:ref(options.ready === false ? [] : tracks), loading:ref(options.ready === false), error:ref(null), refresh() {}}};
  (globalThis as any)[Symbol.for(key)] = harness;
  const root = new HostNode("root");
  const app = renderer.createApp(MusicPlayer,{clip:{trackId:"hbd-001",startMs:1000,endMs:5000}, ...(options.autoPlay === undefined ? {} : {autoPlay:options.autoPlay})});
  const instance = app.mount(root) as unknown as {requestPlay:()=>void};
  const walk = (node:HostNode):HostNode[]=>[node,...node.children.flatMap(walk)];
  const button = (label:string)=>walk(root).find(node=>node.tag === "button" && node.props["aria-label"] === label)!;
  return {root,harness,instance,button,documentRoot, async ready() {harness.catalog.tracks.value=tracks;harness.catalog.loading.value=false; await nextTick();await nextTick();}, unmount() {app.unmount(); if(previous) Object.defineProperty(globalThis,"document",previous);else Reflect.deleteProperty(globalThis,"document");}};
}
test("receiver attempts autoplay once with the saved looping clip and defaults volume safely", async()=>{
  const view=mount();
  try {await nextTick(); assert.equal(view.harness.plays.length,1);assert.equal(view.harness.loop,true);assert.deepEqual(view.harness.plays[0].clip,{trackId:"hbd-001",startMs:1000,endMs:5000});assert.equal(view.harness.audio.volume,.4);view.instance.requestPlay();assert.equal(view.harness.plays.length,1);} finally {view.unmount();}
  assert.equal(view.harness.destroyed,1);
});
test("blocked autoplay exposes the control and gift interaction retries synchronously", async()=>{
  const view=mount({blocked:true});
  try {await nextTick();assert.equal(view.harness.plays.length,1);assert.ok(view.button("Turn music on"));view.harness.blocked=false;view.documentRoot.dispatchEvent(new Event("pointerup"));assert.equal(view.harness.plays.length,2);await nextTick();assert.ok(view.button("Turn music off"));view.documentRoot.dispatchEvent(new Event("pointerup"));assert.equal(view.harness.plays.length,2);} finally {view.unmount();}
});
test("saved music starts immediately without waiting for catalog metadata and preview stays silent",async()=>{
  const view=mount({ready:false});
  try {assert.equal(view.harness.plays.length,1);assert.equal(view.harness.plays[0].src,"/api/moments/birthday-audio/hbd-001");await view.ready();assert.equal(view.harness.plays.length,1);} finally {view.unmount();}
  const preview=mount({autoPlay:false,ready:false});
  try {await preview.ready();assert.equal(preview.harness.plays.length,0);preview.instance.requestPlay();assert.equal(preview.harness.plays.length,1);} finally {preview.unmount();}
});
test("one on/off button controls sound, manual off survives interactions, and hiding pauses playback",async()=>{
  const view=mount();
  try {await nextTick();view.button("Turn music off").props.onClick();view.instance.requestPlay();assert.equal(view.harness.plays.length,1);view.documentRoot.dispatchEvent(new Event("pointerup"));assert.equal(view.harness.plays.length,1);await nextTick();view.button("Turn music on").props.onClick();assert.equal(view.harness.plays.length,2);view.documentRoot.hidden=true;view.documentRoot.dispatchEvent(new Event("visibilitychange"));assert.ok(view.harness.pauses>0);} finally {view.unmount();}
});
