export class EventCanvasPositionGetter {
  private readonly canvas: HTMLCanvasElement;
  private readonly stylePaddingTop: number;
  private readonly stylePaddingLeft: number;
  private readonly styleBorderLeft: number;
  private readonly styleBorderTop: number;
  private readonly htmlTop: number;
  private readonly htmlLeft: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    const computedStyle = getComputedStyle(canvas, null);
    // This complicates things a little but but fixes mouse coordinate problems
    // when there's a border or padding. See get() for more detail
    // if (window.getComputedStyle) {
    this.stylePaddingTop = parseInt(
      computedStyle.getPropertyValue('padding-top')
    );
    this.stylePaddingLeft = parseInt(
      computedStyle.getPropertyValue('padding-left')
    );
    this.styleBorderLeft = parseInt(
      computedStyle.getPropertyValue('border-left-width')
    );
    this.styleBorderTop = parseInt(
      computedStyle.getPropertyValue('border-top-width')
    );

    const html = document.body.parentElement;
    this.htmlTop = html?.offsetTop ?? 0;
    this.htmlLeft = html?.offsetLeft ?? 0;
  }

  get(event: MouseEvent | Touch /*| TouchInit*/): { x: number; y: number } {
    let offsetX = 0;
    let offsetY = 0;

    // Compute the total offset. Additional caching may be possible here
    if (this.canvas.offsetParent !== null) {
      let element: HTMLElement | null = this.canvas;
      do {
        offsetX += element.offsetLeft;
        offsetY += element.offsetTop;
        const offsetParent: Element | null = element.offsetParent;
        element = offsetParent instanceof HTMLElement ? offsetParent : null;
      } while (element);
    }

    // Add padding and border style widths to offset
    // Also add the <html> offsets in case there's a position:fixed bar
    offsetX += this.stylePaddingLeft + this.styleBorderLeft + this.htmlLeft;
    offsetY += this.stylePaddingTop + this.styleBorderTop + this.htmlTop;

    const x = event.pageX - offsetX;
    const y = event.pageY - offsetY;

    // Enable this if the CSS sizing is different than the canvas width/height:
    //mx *= canvas.width / (canvas.clientWidth - paddingWidth);
    //my *= canvas.height / (canvas.clientHeight - paddingHeight);

    return { x: x, y: y };
  }
}
