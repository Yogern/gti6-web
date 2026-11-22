export const $ = <T extends Element = HTMLElement>(
  q: string,
  root: ParentNode = document,
) => root.querySelector<T>(q)!;
export const $$ = <T extends Element = HTMLElement>(
  q: string,
  root: ParentNode = document,
) => Array.from(root.querySelectorAll<T>(q));
export const icon = (name: string, size = 18) =>
  `<svg class="icon" width="${size}" height="${size}" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><use href="/icons.svg#${name}"/></svg>`;
export const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
let timer = 0;
export function toast(text: string) {
  const t = $("#toast");
  t.textContent = text;
  t.classList.add("visible");
  clearTimeout(timer);
  timer = window.setTimeout(() => t.classList.remove("visible"), 2800);
}
export function modal(kicker: string, title: string, body: string) {
  const d = $<HTMLDialogElement>("#dialog");
  d.innerHTML = `<div class="dialog-cap"><span class="eyebrow">${kicker}</span><button class="iconbtn" data-action="close" aria-label="Close dialog">${icon("x")}</button></div><h2 id="dialog-title">${title}</h2>${body}`;
  if (!d.open) d.showModal();
}
export function closeModal() {
  $<HTMLDialogElement>("#dialog").close();
}
export const badge = (t: string) => `<span class="smalltag">${t}</span>`;
