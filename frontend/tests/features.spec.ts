import { test, expect } from '@playwright/test';

test.describe('New Features', () => {
  // Mock API responses
  test.beforeEach(async ({ page }) => {
    // Mock Auth
    await page.route('**/api/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'student-1',
          email: 'student@test.com',
          name: 'Test Student',
          role: 'student'
        })
      });
    });

    // Mock Current Theme
    await page.route('**/api/themes/current', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'theme-1',
          title: 'My Research Theme'
        })
      });
    });

    // Mock File Upload
    await page.route('**/api/reports/upload', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: '/static/uploads/test.jpg'
        })
      });
    });

    // Mock Analysis
    await page.route('**/api/reports/analyze', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          suggested_phase: '情報の収集',
          suggested_phase_id: 'phase-2',
          suggested_abilities: [
            { id: 'ability-1', name: '情報収集能力と先を見る力', score: 5 }
          ],
          ai_comment: '良い視点ですね！'
        })
      });
    });

    // Mock Master Data
    await page.route('**/api/master/research-phases', async route => {
        await route.fulfill({
            status: 200,
            body: JSON.stringify([
                { id: 'phase-1', name: '課題の設定', display_order: 1 },
                { id: 'phase-2', name: '情報の収集', display_order: 2 }
            ])
        });
    });
    
    await page.route('**/api/master/abilities', async route => {
        await route.fulfill({
            status: 200,
            body: JSON.stringify([
                { id: 'ability-1', name: '情報収集能力と先を見る力', display_order: 1 }
            ])
        });
    });

    // Mock Report Creation
    await page.route('**/api/reports', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'report-1',
            content: 'Test content',
            image_url: '/static/uploads/test.jpg'
          })
        });
      } else {
        await route.continue();
      }
    });
  });

  test('Student Report Flow with Image Upload', async ({ page }) => {
    // Login
    await page.goto('http://localhost:3001/login');
    await page.evaluate(() => {
        localStorage.setItem('access_token', 'mock_token');
        localStorage.setItem('user', JSON.stringify({ id: 'student-1', role: 'student' }));
    });
    
    // Go to report page
    await page.goto('http://localhost:3001/student/report');
    
    // Check for "生井校長" (Namai Principal)
    await expect(page.getByText('生井校長')).toBeVisible();
    await expect(page.getByText('今日の探究の足跡を残そう！')).toBeVisible();

    // Check Image Upload is required (Next button disabled)
    const nextButton = page.getByRole('button', { name: /次へ/i });
    await expect(nextButton).toBeDisabled();

    // Enter text
    await page.locator('textarea').fill('今日は本を読みました。');
    
    // Upload image (simulate)
    // Create a dummy file for upload
    await page.setInputFiles('input[type="file"]', {
      name: 'test.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('this is a test image')
    });

    // Wait for upload to "finish" (mocked) and button to enable
    await expect(nextButton).toBeEnabled();

    // Click Next
    await nextButton.click();

    // Analysis Screen
    await expect(page).toHaveURL(/\/analysis/);
    await expect(page.getByText('分析結果')).toBeVisible();
    
    // Check if image preview is shown
    await expect(page.locator('img[alt="Uploaded"]')).toBeVisible();

    // Submit
    await page.getByRole('button', { name: /この内容で報告する/i }).click();

    // Complete Screen
    await expect(page).toHaveURL(/\/complete/);
  });
});

test.describe('Teacher Features', () => {
    test.beforeEach(async ({ page }) => {
        // Mock Teacher Auth
        await page.route('**/api/auth/me', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 'teacher-1',
                    email: 'teacher@test.com',
                    name: 'Test Teacher',
                    role: 'teacher'
                })
            });
        });

        // Mock Student Detail
        await page.route('**/api/dashboard/students/student-1', async route => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify({
                    id: 'student-1',
                    name: 'Student A',
                    email: 'student@test.com',
                    total_reports: 10,
                    current_streak: 3,
                    max_streak: 5,
                    ability_counts: [],
                    is_primary: true
                })
            });
        });

        // Mock Reports
        await page.route('**/api/dashboard/students/student-1/reports', async route => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify([])
            });
        });

        // Mock Seminar Labs
        await page.route('**/api/master/seminar-labs', async route => {
            await route.fulfill({ status: 200, body: JSON.stringify([]) });
        });

        // Mock Books
        await page.route('**/api/master/books', async route => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify([
                    {
                        id: 'book-1',
                        title: 'マインドセット',
                        author: 'キャロル・S・ドゥエック',
                        description: '成長マインドセットの本',
                        recommended_comment: '必読です'
                    },
                    {
                        id: 'book-2',
                        title: 'LIFE SHIFT',
                        author: 'リンダ・グラットン',
                        description: '人生100年時代',
                        recommended_comment: '将来のために'
                    }
                ])
            });
        });
    });

    test('Teacher sees Recommended Books', async ({ page }) => {
        // Login as teacher
        await page.goto('http://localhost:3001/teacher/login');
        await page.evaluate(() => {
            localStorage.setItem('access_token', 'mock_token');
            localStorage.setItem('user', JSON.stringify({ id: 'teacher-1', role: 'teacher' }));
        });

        // Go to Student Detail
        await page.goto('http://localhost:3001/teacher/student/student-1');

        // Check for Book Section
        await expect(page.getByText('指導アドバイス・推薦図書')).toBeVisible();
        
        // Check for Books
        await expect(page.getByRole('heading', { name: 'マインドセット' })).toBeVisible();
        await expect(page.getByText('キャロル・S・ドゥエック')).toBeVisible();
        // Check for the comment including the label
        await expect(page.getByText('生井校長：必読です')).toBeVisible();
    });
});





