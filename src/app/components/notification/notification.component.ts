import { OverlayRef } from '@angular/cdk/overlay';
import { Component, ElementRef, HostListener, Input, OnInit, Renderer2 } from '@angular/core';
import { Animation, AnimationController, Gesture, GestureController, GestureDetail } from '@ionic/angular';
import { Observable, Subject } from 'rxjs';

@Component({
  selector: 'app-notification',
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.scss'],
})
export class NotificationComponent implements OnInit {
  /** 标题 */
  @Input() title: string;
  /** 描述 */
  @Input() description: string;
  /** 图标URL */
  @Input() iconUrl: string;
  /** 浮层 */
  @Input() overlayRef: OverlayRef;
  /** 浮层持续时间 */
  @Input() overlayDuration: number;
  /** 点击事件处理函数 */
  @Input() tapHandler: (e: Event) => void;
  /** 当前Notification的元素 */
  element: HTMLElement;
  /** 取消监听事件函数 */
  unlistener: () => void;

  private dismiss$: Subject<void> = new Subject();
  /** 动画 */
  private animation: Animation;
  /** 手势 */
  private gesture: Gesture;

  constructor(
    private elementRef: ElementRef,
    private renderer2: Renderer2,
    private animationCtrl: AnimationController,
    private gestureCtrl: GestureController
  ) { }

  ngOnInit() {
    this.element = this.elementRef.nativeElement.querySelector('.notification');

    this.animation = this.animationCtrl.create()
      .addElement(this.elementRef.nativeElement)
      .duration(200)
      .fromTo('transform', 'translateY(0)', 'translateY(-100%)')
      .fromTo('opacity', '1', '.5')
      .easing('ease-out');
    this.animation.progressStart(false);

    this.gesture = this.gestureCtrl.create({
      el: this.elementRef.nativeElement,
      threshold: 0,
      gestureName: 'square-drag',
      onMove: (event: GestureDetail) => this.onMove(event),
      onEnd: (event: GestureDetail) => this.onEnd(event)
    });
    this.gesture.enable(true);
  }

  /**
   * 手势移动时
   * @param event
   */
  private onMove(event: GestureDetail) {
    this.animation.progressStart(false);
    this.animation.progressStep(this.getStep(event));
  }

  /**
   * 手势结束时
   * @param event
   */
  private onEnd(event: GestureDetail) {
    this.gesture.enable(false);

    const step = this.getStep(event);
    const shouldComplete = step > 0.4;

    this.animation.progressEnd(shouldComplete ? 1 : 0, step);
    this.animation.onFinish(() => {
      shouldComplete ? this.dismiss() : this.gesture.enable(true);
    });
  }

  private getStep(event: GestureDetail) {
    return this.clamp(0, -event.deltaY / 125, 1);
  }

  private clamp(min: number, n: number, max: number) {
    return Math.max(min, Math.min(n, max));
  }

  ngOnDestroy() {
    this.unlistener && this.unlistener();
    this.gesture.destroy();
    this.animation.destroy();
  }

  /**
   * 关闭通知
   */
  dismiss(): Observable<void> {
    this.renderer2.addClass(this.element, 'hide');
    this.unlistener && this.unlistener();
    this.unlistener = this.renderer2.listen(this.element, 'transitionend', () => {
      this.overlayRef.dispose();
      this.dismiss$.next();
    });

    return this.onDismiss();
  }

  /**
   * 通知关闭时可观察对象
   */
  onDismiss(): Observable<void> {
    return this.dismiss$.asObservable();
  }

  @HostListener('tap', ['$event'])
  onTap(event: Event) {
    this.unlistener && this.unlistener();
    this.unlistener = this.renderer2.listen(this.element, 'transitionend', () => {
      this.dismiss();
      this.tapHandler(event);
    });
  }

}
