import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {

  test.describe('Student Login Page', () => {
    test('should display student login UI elements', async ({ page }) => {
      await page.goto('http://localhost:5173/login');
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('探究学習日記')).toBeVisible();
      const googleButton = page.getByRole('button', { name: /Googleでログイン/i });
      await expect(googleButton).toBeVisible();
    });

    test('should have accessible Google login button', async ({ page }) => {
      await page.goto('http://localhost:5173/login');
      await page.waitForLoadState('networkidle');

      const googleButton = page.getByRole('button', { name: /Googleでログイン/i });
      await expect(googleButton).toBeEnabled();
      await expect(googleButton).toBeVisible();
    });
  });

  test.describe('Teacher Login Page', () => {
    test('should display teacher login UI elements', async ({ page }) => {
      await page.goto('http://localhost:5173/teacher/login');
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('教師用ログイン')).toBeVisible();

      const googleButton = page.getByRole('button', { name: /Googleでログイン/i });
      await expect(googleButton).toBeVisible();
      await expect(page.getByText('学校のアカウントを使用してログインしてください')).toBeVisible();
    });

    test('should have properly styled login card', async ({ page }) => {
      await page.goto('http://localhost:5173/teacher/login');
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('教師用ログイン')).toBeVisible();
      const googleButton = page.getByRole('button', { name: /Googleでログイン/i });
      await expect(googleButton).toBeVisible();
    });
  });

  test.describe('Protected Routes', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('http://localhost:5173');
      await page.evaluate(() => localStorage.clear());
    });

    test('should redirect to login when accessing student menu without token', async ({ page }) => {
      await page.goto('http://localhost:5173/student/menu');
      await page.waitForURL('**/login', { timeout: 10000 });
      expect(page.url()).toContain('/login');
    });

    test('should redirect to login when accessing report without token', async ({ page }) => {
      await page.goto('http://localhost:5173/student/report');
      await page.waitForURL('**/login', { timeout: 10000 });
      expect(page.url()).toContain('/login');
    });

    test('should redirect to login when accessing teacher dashboard without token', async ({ page }) => {
      await page.goto('http://localhost:5173/teacher/dashboard');
      await page.waitForURL('**/login', { timeout: 10000 });
      expect(page.url()).toContain('/login');
    });

    test('should redirect to login when accessing review page without token', async ({ page }) => {
      await page.goto('http://localhost:5173/student/review');
      await page.waitForURL('**/login', { timeout: 10000 });
      expect(page.url()).toContain('/login');
    });
  });

  test.describe('Navigation', () => {
    test('should navigate from root to login page', async ({ page }) => {
      await page.goto('http://localhost:5173/');
      await page.waitForURL('**/login', { timeout: 10000 });
      expect(page.url()).toContain('/login');
    });

    test('should access teacher login directly', async ({ page }) => {
      await page.goto('http://localhost:5173/teacher/login');
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/teacher/login');
      await expect(page.getByText('教師用ログイン')).toBeVisible();
    });
  });

  test.describe('Google OAuth Flow', () => {
    test('should fetch login URL on teacher login page load', async ({ page }) => {
      let apiCalled = false;

      await page.route('**/auth/google/login*', route => {
        apiCalled = true;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ auth_url: 'https://accounts.google.com/mock' })
        });
      });

      await page.goto('http://localhost:5173/teacher/login');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      expect(apiCalled).toBe(true);
    });

    test('should include role=teacher parameter', async ({ page }) => {
      let requestUrl = '';

      await page.route('**/auth/google/login*', route => {
        requestUrl = route.request().url();
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ auth_url: 'https://accounts.google.com/mock' })
        });
      });

      await page.goto('http://localhost:5173/teacher/login');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      expect(requestUrl).toContain('role=teacher');
    });
  });

  test.describe('Callback Page', () => {
    test('should show loading state on callback page', async ({ page }) => {
      await page.route('**/auth/google/callback', route => {
        // Delay the response to show loading state
        return new Promise(resolve => {
          setTimeout(() => {
            route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                access_token: 'mock_token',
                user: { id: '1', email: 'test@test.com', name: 'Test', role: 'student' }
              })
            });
            resolve(undefined);
          }, 3000);
        });
      });

      await page.goto('http://localhost:5173/auth/callback?code=mock_code&state=cm9sZT1zdHVkZW50');

      // Check for loading state before response arrives
      await expect(page.getByText('認証中...')).toBeVisible({ timeout: 2000 });
    });

    test('should redirect to login if no code is provided', async ({ page }) => {
      await page.goto('http://localhost:5173/auth/callback');
      await page.waitForURL('**/login', { timeout: 10000 });
      expect(page.url()).toContain('/login');
    });
  });

  test.describe('Responsive Design', () => {
    test('should display correctly on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('http://localhost:5173/teacher/login');
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('教師用ログイン')).toBeVisible();
      await expect(page.getByRole('button', { name: /Googleでログイン/i })).toBeVisible();
    });

    test('should display correctly on desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('http://localhost:5173/teacher/login');
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('教師用ログイン')).toBeVisible();
      await expect(page.getByRole('button', { name: /Googleでログイン/i })).toBeVisible();
    });
  });
});
