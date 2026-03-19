import type { FocusEvent } from 'react'

export function replaceLeadingZeroOnFocus(
  event: FocusEvent<HTMLInputElement>,
) {
  const value = event.currentTarget.value.trim()

  if (value === '0' || value === '0.0') {
    event.currentTarget.select()
  }
}
