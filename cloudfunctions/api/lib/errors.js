class BizError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'BizError'
    this.code = code
  }
}

module.exports = { BizError }
