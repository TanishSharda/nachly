import type { Page } from '@playwright/test'

export async function navigateWithRetry(page: Page, url: string, options: { waitUntil?: any; timeout?: number } = {}, retries = 2) {
  let lastErr: any = null
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await page.goto(url, { waitUntil: options.waitUntil ?? 'load', timeout: options.timeout ?? 60000 })
      return
    } catch (err) {
      lastErr = err
      // If page/context closed, try to recreate page if possible
      try {
        if (page.isClosed() && attempt < retries) {
          // can't reopen same page; throw to caller — let test fixture handle new page creation
          throw err
        }
      } catch (e) {
        // ignore
      }
      // small backoff before retry
      if (attempt < retries) await new Promise((r) => setTimeout(r, 500 * (attempt + 1)))
    }
  }
  throw lastErr
}

export default navigateWithRetry
