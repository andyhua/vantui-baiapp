import { VantComponent } from '../common/component';
import { touch } from '../mixins/touch';

type TabItemData = {
  width?: number
  active: boolean
  inited?: boolean
  animated?: boolean
};

type Position = 'top' | 'bottom' | '';

VantComponent({
  mixins: [touch],

  classes: ['nav-class', 'tab-class', 'tab-active-class', 'line-class'],
  props: {
    color: String,
    sticky: Boolean,
    animated: Boolean,
    swipeable: Boolean,
    lineWidth: {
      type: Number,
      value: -1
    },
    lineHeight: {
      type: Number,
      value: -1
    },
    active: {
      type: Number,
      value: 0
    },
    type: {
      type: String,
      value: 'line'
    },
    border: {
      type: Boolean,
      value: true
    },
    duration: {
      type: Number,
      value: 0.3
    },
    zIndex: {
      type: Number,
      value: 1
    },
    swipeThreshold: {
      type: Number,
      value: 4
    },
    offsetTop: {
      type: Number,
      value: 0
    }
  },

  data: {
    tabs: [],
    lineStyle: '',
    scrollLeft: 0,
    scrollable: false,
    trackStyle: '',
    wrapStyle: '',
    position: ''
  },

  watch: {
    swipeThreshold() {
      this.set({
        scrollable: this.child.length > this.data.swipeThreshold
      });
    },
    color: 'setLine',
    lineWidth: 'setLine',
    lineHeight: 'setLine',
    active: 'setActiveTab',
    animated: 'setTrack',
    offsetTop: 'setWrapStyle'
  },

  beforeCreate() {
    this.child = [];
  },
  created() {
    this.setSlotChild().then(children => {
      this.child = children;
    });        
  },
  mounted() {
    this.setLine(true);
    this.setTrack();
    this.scrollIntoView();

    this.getRect('.van-tabs__wrap').then(
      (rect: swan.BoundingClientRectCallbackResult) => {
        this.navHeight = rect.height;
        this.observerContentScroll();
      }
    );
  },

  destroyed() {
    this.createIntersectionObserver().disconnect();
  },

  methods: {
    updateTabs(tabs: TabItemData[]) {
      tabs = tabs || this.data.tabs;
      this.set({
        tabs,
        scrollable: tabs.length > this.data.swipeThreshold
      });
      this.setActiveTab();
    },

    trigger(eventName: string, index: number) {
      this.$emit(eventName, {
        index,
        title: this.data.tabs[index].title
      });
    },

    onTap(event: Weapp.Event) {
      const { index } = event.currentTarget.dataset;
      if (this.data.tabs[index].disabled) {
        this.trigger('disabled', index);
      } else {
        this.trigger('click', index);
        this.setActive(index);
      }
    },

    setActive(active: number) {
      if (active !== this.data.active) {
        this.trigger('change', active);
        this.set({ active });
        this.setActiveTab();
      }
    },

    setLine(skipTransition?: boolean) {
      if (this.data.type !== 'line') {
        return;
      }

      const { color, active, duration, lineWidth, lineHeight } = this.data;

      this.getRect('.van-tab', true).then(
        (rects: wx.BoundingClientRectCallbackResult[]) => {
          const rect = rects[active];
          const width = lineWidth !== -1 ? lineWidth : rect.width / 2;
          const height = lineHeight !== -1 ? `height: ${lineHeight}px;` : '';

          let left = rects
            .slice(0, active)
            .reduce((prev, curr) => prev + curr.width, 0);

          left += (rect.width - width) / 2;

          const transition = skipTransition
            ? ''
            : `transition-duration: ${duration}s; -webkit-transition-duration: ${duration}s;`;

          this.set({
            lineStyle: `
            ${height}
            width: ${width}px;
            background-color: ${color};
            -webkit-transform: translateX(${left}px);
            transform: translateX(${left}px);
            ${transition}
          `
          });
        }
      );
    },

    setTrack() {
      const { animated, active, duration } = this.data;

      if (!animated) return '';

      this.getRect('.van-tabs__content').then(
        (rect: swan.BoundingClientRectCallbackResult) => {
          const { width } = rect;

          this.set({
            trackStyle: `
            width: ${width * this.child.length}px;
            left: ${-1 * active * width}px;
            transition: left ${duration}s;
            display: -webkit-box;
            display: flex;
          `
          });

          const props = { width, animated };

          this.child.forEach((item: Weapp.Component) => {
            item.set(props);
          });
        }
      );
    },

    setActiveTab() {
      if(!this.child) return false;
      this.child.forEach((item: Weapp.Component, index: number) => {
        const data: TabItemData = {
          active: index === this.data.active
        };

        if (data.active) {
          data.inited = true;
        }

        if (data.active !== item.data.active) {
          item.set(data);
        }
      });

      this.set({}, () => {
        this.setLine();
        this.setTrack();
        this.scrollIntoView();
      });
    },

    // scroll active tab into view
    scrollIntoView() {
      const { active, scrollable } = this.data;

      if (!scrollable) {
        return;
      }

      Promise.all([
        this.getRect('.van-tab', true),
        this.getRect('.van-tabs__nav')
      ]).then(
        ([tabRects, navRect]: [
        swan.BoundingClientRectCallbackResult[],
        swan.BoundingClientRectCallbackResult
        ]) => {
          const tabRect = tabRects[active];
          const offsetLeft = tabRects
            .slice(0, active)
            .reduce((prev, curr) => prev + curr.width, 0);

          this.set({
            scrollLeft: offsetLeft - (navRect.width - tabRect.width) / 2
          });
        }
      );
    },

    onTouchStart(event: Weapp.TouchEvent) {
      if (!this.data.swipeable) return;

      this.touchStart(event);
    },

    onTouchMove(event: Weapp.TouchEvent) {
      if (!this.data.swipeable) return;

      this.touchMove(event);
    },

    // watch swipe touch end
    onTouchEnd() {
      if (!this.data.swipeable) return;

      const { active, tabs } = this.data;

      const { direction, deltaX, offsetX } = this;
      const minSwipeDistance = 50;

      if (direction === 'horizontal' && offsetX >= minSwipeDistance) {
        if (deltaX > 0 && active !== 0) {
          this.setActive(active - 1);
        } else if (deltaX < 0 && active !== tabs.length - 1) {
          this.setActive(active + 1);
        }
      }
    },

    setWrapStyle() {
      const { offsetTop, position } = this.data as {
        offsetTop: number
        position: Position
      };
      let wrapStyle: string;

      switch (position) {
        case 'top':
          wrapStyle = `
            top: ${offsetTop}px;
            position: fixed;
          `;
          break;
        case 'bottom':
          wrapStyle = `
            top: auto;
            bottom: 0;
          `;
          break;
        default:
          wrapStyle = '';
      }

      // cut down `set`
      if (wrapStyle === this.data.wrapStyle) return;

      this.set({ wrapStyle });
    },

    observerContentScroll() {
      if (!this.data.sticky) {
        return;
      }

      const { offsetTop } = this.data;
      const { windowHeight } = swan.getSystemInfoSync();

      this.createIntersectionObserver().disconnect();

      this.createIntersectionObserver()
        .relativeToViewport({ top: -(this.navHeight + offsetTop) })
        .observe('.van-tabs', (res: swan.ObserveCallbackResult) => {
          const { top } = res.boundingClientRect;

          if (top > offsetTop) {
            return;
          }

          const position: Position =
            res.intersectionRatio > 0 ? 'top' : 'bottom';

          this.$emit('scroll', {
            scrollTop: top + offsetTop,
            isFixed: position === 'top'
          });

          this.setPosition(position);
        });

      this.createIntersectionObserver()
        .relativeToViewport({ bottom: -(windowHeight - 1 - offsetTop) })
        .observe('.van-tabs', (res: swan.ObserveCallbackResult) => {
          const { top, bottom } = res.boundingClientRect;

          if (bottom < this.navHeight) {
            return;
          }

          const position: Position = res.intersectionRatio > 0 ? 'top' : '';

          this.$emit('scroll', {
            scrollTop: top + offsetTop,
            isFixed: position === 'top'
          });

          this.setPosition(position);
        });
    },

    setPosition(position: Position) {
      if (position !== this.data.position) {
        this.set({ position }).then(() => {
          this.setWrapStyle();
        });
      }
    }
  }
});
