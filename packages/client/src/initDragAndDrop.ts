import { CanvasWrapper } from './canvasWrapper';
import { ImageShape } from './imageShape';
import { uuidv4 } from '@my/shared';

export function initDragAndDrop(
  canvas: HTMLCanvasElement,
  canvasWrapper: CanvasWrapper
): void {
  for (const eventName of ['dragenter', 'dragover', 'dragleave', 'drop']) {
    canvas.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  }

  for (const eventName of ['dragenter', 'dragover']) {
    canvas.addEventListener(eventName, (_) => {
      canvas.classList.add('highlight');
    });
  }

  for (const eventName of ['dragleave', 'drop']) {
    canvas.addEventListener(eventName, (_) => {
      canvas.classList.remove('highlight');
    });
  }

  canvas.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (dt) {
      const files = dt.files;
      const mousePos = canvasWrapper.eventCanvasPositionGetter.get(e);
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = () => {
          const image = new Image();
          const result = reader.result;
          if (typeof result === 'string') {
            image.src = result;
            image.onload = () => {
              const imageShape = new ImageShape(
                mousePos.x,
                mousePos.y,
                image.width,
                image.height,
                uuidv4(),
                image
              );
              canvasWrapper.addRectShape(imageShape);
              canvasWrapper.onRectShapeCreated(imageShape, result);
            };
          }
        };
      }
    }
  });
}
