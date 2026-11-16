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

const MEMBER_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  LEFT: 'left',
  REJECTED: 'rejected'
}

const MEMBER_STATUS_LABEL = {
  pending: '待审核',
  active: '正常',
  left: '已退会',
  rejected: '未通过'
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
  MEMBER_STATUS,
  MEMBER_STATUS_LABEL,
  SIGNUP_STATUS
}
