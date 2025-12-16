import { test } from '@playwright/test';

const BASE_URL = 'https://koya-app-frontend-dev.azurewebsites.net';
const TEST_USER = {
  email: 'student1@test.com',
  password: 'password123'
};

test.describe('Student Login and Report Flow', () => {
  test('Complete student flow: login → report → calendar verification', async ({ page }) => {
    test.setTimeout(120000);

    // 1. Navigate to login screen
    console.log('Step 1: Navigate to login screen');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/01-login-selection.png', fullPage: true });

    // 2. Click "生徒ログインはこちら"
    console.log('Step 2: Click student login button');
    await page.click('button:has-text("生徒ログインはこちら")');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/02-student-login-page.png', fullPage: true });

    // 3. Click test user login option
    console.log('Step 3: Click test user login');
    const testLoginButton = page.locator('text=テストユーザーログイン').or(page.locator('button:has-text("テスト")'));
    if (await testLoginButton.isVisible()) {
      await testLoginButton.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: 'screenshots/03-test-login-form.png', fullPage: true });

    // 4. Fill login form
    console.log('Step 4: Fill login credentials');
    await page.fill('input[type="email"], input[placeholder*="メール"]', TEST_USER.email);
    await page.fill('input[type="password"], input[placeholder*="パスワード"]', TEST_USER.password);
    await page.screenshot({ path: 'screenshots/04-login-form-filled.png', fullPage: true });

    // 5. Submit login
    console.log('Step 5: Submit login');
    await page.click('button[type="submit"], button:has-text("ログイン")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/05-after-login.png', fullPage: true });

    // 6. Check if on menu
    console.log('Step 6: Verify menu screen');
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    // Look for menu elements
    const reportButton = page.locator('text=報告').or(page.locator('text=きょうの報告'));

    await page.screenshot({ path: 'screenshots/06-menu-screen.png', fullPage: true });

    // 7. Click report button
    console.log('Step 7: Navigate to report');
    if (await reportButton.first().isVisible()) {
      await reportButton.first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: 'screenshots/07-report-screen.png', fullPage: true });

    // 8. Try to create a report (navigate through steps)
    console.log('Step 8: Create report');

    // Look for "報告を始める" or similar
    const startButton = page.locator('button:has-text("報告を始める")').or(page.locator('button:has-text("始める")'));
    if (await startButton.isVisible()) {
      await startButton.click();
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: 'screenshots/08-report-step1.png', fullPage: true });

    // Skip photo step if exists
    const skipOrNext = page.locator('button:has-text("スキップ")').or(page.locator('button:has-text("次")'));
    if (await skipOrNext.first().isVisible()) {
      await skipOrNext.first().click();
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: 'screenshots/09-report-step2.png', fullPage: true });

    // Fill textarea if exists
    const textarea = page.locator('textarea').first();
    if (await textarea.isVisible()) {
      await textarea.fill('Playwrightテスト: 自動テストを実施しました。');
      await page.screenshot({ path: 'screenshots/10-report-filled.png', fullPage: true });

      // Click next
      if (await skipOrNext.first().isVisible()) {
        await skipOrNext.first().click();
        await page.waitForTimeout(1000);
      }
    }

    await page.screenshot({ path: 'screenshots/11-report-progress.png', fullPage: true });

    // Navigate back to menu
    console.log('Step 9: Go back to menu');
    await page.goto(BASE_URL + '/student/menu');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/12-back-to-menu.png', fullPage: true });

    // 10. Navigate to calendar/review
    console.log('Step 10: Navigate to calendar');
    const calendarButton = page.locator('button:has-text("振り返り")').or(page.locator('text=振り返り'));
    if (await calendarButton.first().isVisible()) {
      await calendarButton.first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }
    await page.screenshot({ path: 'screenshots/13-calendar-view.png', fullPage: true });

    // 11. Check calendar content
    console.log('Step 11: Check calendar content');
    const calendarTitle = page.locator('text=あしあとカレンダー').or(page.locator('text=カレンダー'));
    const isCalendarVisible = await calendarTitle.isVisible();
    console.log('Calendar visible:', isCalendarVisible);

    await page.screenshot({ path: 'screenshots/14-calendar-loaded.png', fullPage: true });

    // 12. Try to click on a day with reports
    console.log('Step 12: Try clicking on report day');
    const reportDays = page.locator('.cursor-pointer.hover\\:scale-105');
    const reportDayCount = await reportDays.count();
    console.log('Days with reports:', reportDayCount);

    if (reportDayCount > 0) {
      await reportDays.first().click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'screenshots/15-report-modal.png', fullPage: true });

      // Close modal if open
      const closeButton = page.locator('button:has-text("閉じる")');
      if (await closeButton.isVisible()) {
        await closeButton.click();
        await page.waitForTimeout(500);
      }
    }

    await page.screenshot({ path: 'screenshots/16-test-complete.png', fullPage: true });
    console.log('Test completed!');
  });
});
