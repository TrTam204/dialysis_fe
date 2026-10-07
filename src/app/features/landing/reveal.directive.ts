import { Directive, ElementRef, OnInit, OnDestroy, Input, Renderer2, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Directive({
  selector: '[appReveal]',
  standalone: true
})
export class RevealDirective implements OnInit, OnDestroy {
  @Input() delay: number | string = 0;
  @Input() direction: 'up' | 'down' | 'left' | 'right' | 'fade' = 'up';
  @Input() threshold: number = 0.15;
  @Input() duration: string = '0.8s';

  private observer: IntersectionObserver | null = null;
  private isBrowser: boolean;

  get parsedDelay(): number {
    return typeof this.delay === 'string' ? parseInt(this.delay, 10) : this.delay;
  }

  constructor(
    private el: ElementRef,
    private renderer: Renderer2,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    if (!this.isBrowser) return;

    this.renderer.addClass(this.el.nativeElement, 'reveal-element');
    this.renderer.addClass(this.el.nativeElement, `reveal-${this.direction}`);
    
    const delayMs = this.parsedDelay;
    if (delayMs > 0) {
      this.renderer.setStyle(this.el.nativeElement, 'transition-delay', `${delayMs}ms`);
    }
    
    this.renderer.setStyle(this.el.nativeElement, 'transition-duration', this.duration);

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.renderer.addClass(this.el.nativeElement, 'revealed');
            // Stop observing once revealed
            if (this.observer) {
              this.observer.unobserve(this.el.nativeElement);
            }
          }
        });
      },
      {
        threshold: this.threshold,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    this.observer.observe(this.el.nativeElement);
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}
