const ROLE = {
  CHAIRMAN: 'chairman',
  MINISTER: 'minister',
  MEMBER: 'member'
}

const ROLE_LABEL = {
  chairman: '主席',
  minister: '部长',
  member: '小干'
}

const DEPT = {
  PHOTO: 'photo',
  PR: 'pr',
  OPS: 'ops'
}

const DEPT_LABEL = {
  photo: '摄影师队',
  pr: '宣传部',
  ops: '运营部'
}

const SIGNUP_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  WAITLISTED: 'waitlisted',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
  LEAVE_PENDING: 'leave_pending',
  LEFT: 'left'
}

module.exports = {
  ROLE,
  ROLE_LABEL,
  DEPT,
  DEPT_LABEL,
  SIGNUP_STATUS
}
