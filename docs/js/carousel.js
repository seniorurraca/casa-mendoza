const SWIPE_PX = 40;

export const wrapIndex = (index, length) => ((index % length) + length) % length;

export function createCarousel(dialog) {
  const img = dialog.querySelector(".carousel-img");
  const counter = dialog.querySelector(".carousel-counter");
  const caption = dialog.querySelector(".carousel-caption");
  let photos = [];
  let index = 0;
  let swipeStartX = null;
  let swiped = false;

  const show = i => {
    index = wrapIndex(i, photos.length);
    img.src = photos[index];
    counter.textContent = `${index + 1} / ${photos.length}`;
  };

  dialog.addEventListener("click", event => {
    if (swiped) return void (swiped = false);
    const step = event.target.closest("[data-step]")?.dataset.step;
    if (step) show(index + Number(step));
    else if (event.target === dialog || event.target.closest("[data-action=close]")) dialog.close();
  });

  dialog.addEventListener("keydown", event => {
    if (event.key === "ArrowRight") show(index + 1);
    if (event.key === "ArrowLeft") show(index - 1);
  });

  dialog.addEventListener("pointerdown", event => { swipeStartX = event.clientX; });
  dialog.addEventListener("pointerup", event => {
    const dx = event.clientX - (swipeStartX ?? event.clientX);
    swipeStartX = null;
    if (Math.abs(dx) < SWIPE_PX) return;
    swiped = true;
    show(index + (dx < 0 ? 1 : -1));
  });

  return {
    open(list, start, label) {
      photos = list;
      caption.textContent = label;
      dialog.classList.toggle("single", list.length < 2);
      show(start);
      dialog.showModal();
    },
  };
}
