import interact from "interactjs";

// ----- InteractJS simplified, centralized setup -----
// Selectors and grid configuration
export const PALETTE_ITEM_SELECTOR = ".area";
export const CANVAS_SELECTOR = ".workflow-canvas";
const GRID = { x: 30, y: 30 };

// Shared listeners using per-element dataset state
function ensureDatasetState(el: HTMLElement) {
    if (el.dataset.x == null) el.dataset.x = "0";
    if (el.dataset.y == null) el.dataset.y = "0";
}

export function onDragStart(event: any) {
    const target = event.target as HTMLElement;
    ensureDatasetState(target);
}

export function onDragMove(event: any) {
    const target = event.target as HTMLElement;
    const prevX = parseFloat(target.dataset.x || "0");
    const prevY = parseFloat(target.dataset.y || "0");
    const x = prevX + event.dx;
    const y = prevY + event.dy;
    target.style.transform = `translate(${x}px, ${y}px)`;
    target.dataset.x = String(x);
    target.dataset.y = String(y);
}

export function getModifiers(insideCanvas: boolean) {
    const snapMod = interact.modifiers.snap({
        targets: [interact.snappers.grid({ x: GRID.x, y: GRID.y })],
        range: Infinity,
        relativePoints: [{ x: 0, y: 0 }],
    });
    const restrictMod = interact.modifiers.restrict({
        restriction: insideCanvas ? "parent" : CANVAS_SELECTOR,
        elementRect: { top: 0, left: 0, bottom: 1, right: 1 },
        endOnly: !insideCanvas,
    });
    return [snapMod, restrictMod];
}

function applyDraggable(el: Element, insideCanvas: boolean) {
    try {
        interact(el as HTMLElement).unset();
    } catch {}
    interact(el as HTMLElement)
        .draggable({
            modifiers: getModifiers(insideCanvas),
            inertia: false,
        })
        .on("dragstart", onDragStart)
        .on("dragmove", onDragMove);
}

export function handleOnDrop(event: any) {
    const dragged = event.relatedTarget as HTMLElement;
    const dropzone = event.target as HTMLElement;
    if (!dragged || !dropzone) return;

    const alreadyChild = dragged.parentElement === dropzone;
    if (alreadyChild) return; // don't reset or reconfigure existing items

    // Create a copy for the canvas, keep original in palette
    const copy = dragged.cloneNode(true) as HTMLElement;

    // Ensure the copy starts at the canvas origin and is absolutely positioned
    copy.style.position = "absolute";
    copy.style.top = "0";
    copy.style.left = "0";
    copy.style.transform = "translate(0px, 0px)";
    copy.dataset.x = "0";
    copy.dataset.y = "0";

    // Append the copy to the canvas and make it draggable within it
    dropzone.appendChild(copy);
    applyDraggable(copy, true);

    // Reset the original back to its initial state/spot
    dragged.style.transform = "translate(0px, 0px)";
    dragged.dataset.x = "0";
    dragged.dataset.y = "0";
    dragged.style.position = "";
    dragged.style.top = "";
    dragged.style.left = "";

}