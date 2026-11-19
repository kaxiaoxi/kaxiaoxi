Component({
  options: {
    multipleSlots: true
  },

  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    title: {
      type: String,
      value: ''
    },
    description: {
      type: String,
      value: ''
    },
    cancelText: {
      type: String,
      value: '取消'
    },
    confirmText: {
      type: String,
      value: '确认'
    },
    danger: {
      type: Boolean,
      value: false
    },
    loading: {
      type: Boolean,
      value: false
    },
    closeOnMask: {
      type: Boolean,
      value: true
    }
  },

  methods: {
    onClose() {
      if (this.properties.loading) return
      this.triggerEvent('close')
    },

    onMaskTap() {
      if (!this.properties.closeOnMask) return
      this.onClose()
    },

    onConfirm() {
      if (this.properties.loading) return
      this.triggerEvent('confirm')
    },

    onTouchStart(e) {
      this.touchStartY = e.touches[0].clientY
    },

    onTouchMove(e) {
      if (!this.touchStartY) return
      this.touchDistance = e.touches[0].clientY - this.touchStartY
    },

    onTouchEnd() {
      const shouldClose = this.touchDistance > 64
      this.touchStartY = 0
      this.touchDistance = 0
      if (shouldClose) this.onClose()
    },

    noop() {}
  }
})
