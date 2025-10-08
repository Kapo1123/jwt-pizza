import { Page } from '@playwright/test';
import { test, expect } from 'playwright-test-coverage';
import { Role, User } from '../src/service/pizzaService';
async function basicInit(page: Page) {
  // Handle user registration
  await page.route('*/**/api/auth', async (route) => {
    if (route.request().method() === 'POST') {
      const registerReq = route.request().postDataJSON();
      const registerRes = {
        "user": {
          "name": registerReq.name,
          "email": registerReq.email,
          "roles": [
            {
              "role": "diner"
            }
          ],
          "id": 158
        },
        "token": "123.eyJuYW1lIjoiaGkiLCJlbWFpbCI6ImhpQGhpLmNvbSIsInJvbGVzIjpbeyJyb2xlIjoiZGluZXIifV0sImlkIjoxNTgsImlhdCI6MTc1OTkwNTk4Nn0.GSpJJL4QEcQyFHbw--6aXKUEl9B4LbtPc6QBSbMV_v0"
      };
      await route.fulfill({ json: registerRes });
    }
  });
}
test("register new user", async ({ page }) => {
  await basicInit(page);
  await page.goto('http://localhost:5173/');
  await page.getByRole('link', { name: 'Register' }).click();
  await page.getByRole('textbox', { name: 'Full name' }).click();
  await page.getByRole('textbox', { name: 'Full name' }).fill('john');
  await page.getByRole('textbox', { name: 'Full name' }).press('Tab');
  await page.getByRole('textbox', { name: 'Email address' }).fill('john@test.com');
  await page.getByRole('textbox', { name: 'Email address' }).press('Tab');
  await page.getByRole('textbox', { name: 'Password' }).fill('123');
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByLabel('Global')).toContainText('j');
  await expect(page.getByRole('link', { name: 'Logout' })).toBeVisible();
});