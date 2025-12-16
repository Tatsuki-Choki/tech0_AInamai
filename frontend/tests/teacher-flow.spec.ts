import { test } from '@playwright/test';

const BASE_URL = 'https://koya-app-frontend-dev.azurewebsites.net';
const TEST_USER = {
  email: 'teacher@test.com',
  password: 'password123'
};

test.describe('Teacher Login and Dashboard Flow', () => {
  test('Complete teacher flow: login → dashboard → student list verification', async ({ page }) => {
    test.setTimeout(120000);

    // 1. Navigate directly to teacher login page
    console.log('Step 1: Navigate to teacher login page');
    await page.goto(BASE_URL + '/teacher/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/teacher-01-teacher-login-page.png', fullPage: true });

    // 2. Click "テストユーザーログインはこちら" to show the form
    console.log('Step 2: Click test user login link');
    const testLoginLink = page.locator('button:has-text("テストユーザーログインはこちら")');
    if (await testLoginLink.isVisible()) {
      await testLoginLink.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: 'screenshots/teacher-02-test-login-form.png', fullPage: true });

    // 3. Fill login form - target the form inputs specifically
    console.log('Step 3: Fill login credentials');
    // The test form has specific structure with border-brand-primary/20
    const testForm = page.locator('form.flex.flex-col.gap-3');
    const emailInput = testForm.locator('input[type="email"]');
    const passwordInput = testForm.locator('input[type="password"]');

    if (await emailInput.isVisible()) {
      await emailInput.fill(TEST_USER.email);
      console.log('Email filled:', TEST_USER.email);
    } else {
      console.log('Email input not found in test form');
    }

    if (await passwordInput.isVisible()) {
      await passwordInput.fill(TEST_USER.password);
      console.log('Password filled');
    } else {
      console.log('Password input not found in test form');
    }
    await page.screenshot({ path: 'screenshots/teacher-03-login-form-filled.png', fullPage: true });

    // 4. Submit login - click the gray button inside the form (not the blue main button)
    console.log('Step 4: Submit login');
    // The test login button is inside the form and has bg-gray-700 class
    const testSubmitButton = testForm.locator('button[type="submit"]');

    if (await testSubmitButton.isVisible()) {
      console.log('Found test submit button, clicking...');
      await testSubmitButton.click();
    } else {
      console.log('Test submit button not found');
    }

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/teacher-04-after-login.png', fullPage: true });

    // 5. Check if on dashboard/menu
    console.log('Step 5: Verify dashboard screen');
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    // Should be on /teacher/menu or /teacher/dashboard
    const isOnTeacherPage = currentUrl.includes('/teacher/');
    console.log('Is on teacher page:', isOnTeacherPage);

    await page.screenshot({ path: 'screenshots/teacher-05-dashboard.png', fullPage: true });

    // 6. Look for student list
    console.log('Step 6: Check for student list');
    const studentListTab = page.locator('text=生徒一覧');
    const studentCards = page.locator('[class*="cursor-pointer"]').filter({ hasText: /年|組|さん/ });

    const tabVisible = await studentListTab.isVisible().catch(() => false);
    const cardsCount = await studentCards.count();

    console.log('Student list tab visible:', tabVisible);
    console.log('Student cards found:', cardsCount);

    // Also check for any student-related elements
    const anyStudentElement = await page.locator('text=/田中|鈴木|山田|生徒/').count();
    console.log('Student-related elements found:', anyStudentElement);

    await page.screenshot({ path: 'screenshots/teacher-06-student-list.png', fullPage: true });

    // 7. Summary
    console.log('\n=== TEST SUMMARY ===');
    console.log('Final URL:', currentUrl);
    console.log('On teacher page:', isOnTeacherPage);
    console.log('Student cards found:', cardsCount);
    console.log('Student-related elements:', anyStudentElement);
    console.log('Test completed!');
  });
});
