import { Role, User } from '../src/service/pizzaService';
import { test, expect } from 'playwright-test-coverage';
import { Page } from '@playwright/test';

async function basicInit(page: Page) {
  let loggedInUser: User | undefined;
  const validUsers: Record<string, User> = { 
    'f@jwt.com': { 
      id: '3', 
      name: 'pizza franchisee', 
      email: 'f@jwt.com', 
      password: 'a', 
      roles: [{ role: Role.Franchisee, objectId: '1' }] 
    } 
  };
  await page.route('*/**/api/auth', async (route) => {
    if (route.request().method() === 'PUT') {
      const loginReq = route.request().postDataJSON();
      const user = validUsers[loginReq.email];
      if (!user || user.password !== loginReq.password) {
        await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
        return;
      }
      loggedInUser = validUsers[loginReq.email];
      const loginRes = {
        user: {
          id: 3,
          name: loggedInUser.name,
          email: loggedInUser.email,
          roles: [{ objectId: 1, role: 'franchisee' }]
        },
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywibmFtZSI6InBpenphIGZyYW5jaGlzZWUiLCJlbWFpbCI6ImZAand0LmNvbSIsInJvbGVzIjpbeyJvYmplY3RJZCI6MSwicm9sZSI6ImZyYW5jaGlzZWUifV0sImlhdCI6MTc1OTgyMzgxNX0.jTmifAQOFdKNhSg6I1TY2Pw6wbFayIUI6QqBG8W2GZg',
      };
      await route.fulfill({ json: loginRes });
    } else if (route.request().method() === 'DELETE') {
      await route.fulfill({ json: { "message": "logout successful" } });
    }
  });
    await page.goto('http://localhost:5173/');
    await page.getByRole('link', { name: 'About' }).click();
    await expect(page.getByRole('main')).toContainText('The secret sauce');
}

// test("about page has correct title", async ({ page }) => {
//   await basicInit(page);
//   await page.goto('http://localhost:5173/about');
//   await expect(page.getByRole('main')).toContainText('The secret sauce');
// });



test("logout user", async ({ page }) => {
  await basicInit(page);
 await page.goto('http://localhost:5173/');
 await page.getByRole('link', { name: 'Login' }).click();
 await page.getByRole('textbox', { name: 'Email address' }).click();
 await page.getByRole('textbox', { name: 'Email address' }).fill('f@jwt.com');
 await page.getByRole('textbox', { name: 'Email address' }).press('Tab');
 await page.getByRole('textbox', { name: 'Password' }).fill('a');
 await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByRole('link', { name: 'Logout' })).toBeVisible();
 await page.getByRole('link', { name: 'Logout' }).click();
 await expect(page.getByRole('link', { name: 'Login' })).toBeVisible();
});
