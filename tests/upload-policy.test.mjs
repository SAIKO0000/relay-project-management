import assert from 'node:assert/strict'
import test from 'node:test'

import {
  uploadPolicySummary,
  validateUploadFile,
} from '../lib/upload-policy.ts'

test('photo upload guidance states every supported format and limit', () => {
  assert.equal(
    uploadPolicySummary('photo'),
    'JPG, JPEG, PNG, WEBP · Maximum 3 MB',
  )
})

test('photo validation explains unsupported and mismatched formats', () => {
  const unsupported = new File(['image'], 'site-photo.heic', { type: 'image/heic' })
  const mismatched = new File(['image'], 'renamed.jpg', { type: 'image/png' })

  assert.equal(
    validateUploadFile(unsupported, 'photo'),
    'site-photo.heic: .heic is not supported. Choose JPG, JPEG, PNG, WEBP.',
  )
  assert.match(
    validateUploadFile(mismatched, 'photo') ?? '',
    /image\/png, which does not match \.jpg/,
  )
})

test('photo validation reports actual size and accepts a valid image', () => {
  const oversized = new File(
    [new Uint8Array(3 * 1024 * 1024 + 1)],
    'large.jpg',
    { type: 'image/jpeg' },
  )
  const valid = new File(['image'], 'valid.webp', { type: 'image/webp' })

  assert.equal(
    validateUploadFile(oversized, 'photo'),
    'large.jpg is 3.01 MB. The maximum image size is 3 MB.',
  )
  assert.equal(validateUploadFile(valid, 'photo'), null)
})
