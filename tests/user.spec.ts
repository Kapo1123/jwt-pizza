import { Page } from '@playwright/test';
import { test, expect } from 'playwright-test-coverage';
async function basicInit(page: Page) {
  let currentUser: {
    id: number;
    name: string;
    email: string;
    roles: { role: string }[];
  } | null = null;

  // Handle registration, login, and logout flows
  await page.route('*/**/api/auth', async (route) => {
    const method = route.request().method();
    const body = route.request().postDataJSON?.() ?? {};

    if (method === 'POST') {
     if (body.name === "admin person"){
        currentUser = {
        id: 158,
        name: body.name,
        email: body.email,
        roles: [{ role: 'admin' }],
      };
        await route.fulfill({
        json: {
          user: currentUser,
          token: 'mock-token-123',
        },
      });
      return;
     }
      // Registration
      currentUser = {
        id: 158,
        name: body.name,
        email: body.email,
        roles: [{ role: 'diner' }],
      };
      await route.fulfill({
        json: {
          user: currentUser,
          token: 'mock-token-123',
        },
      });
      return;
    }

    if (method === 'PUT') {
      // Login
      if (!currentUser || currentUser.email !== body.email) {
        await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
        return;
      }
      await route.fulfill({
        json: {
          user: currentUser,
          token: 'mock-token-123',
        },
      });
      return;
    }

    if (method === 'DELETE') {
      // Logout – keep user data so the test can log back in
      await route.fulfill({ json: { message: 'logout successful' } });
    }
  });

  const handleUserRoute = async (route: any) => {
    const method = route.request().method();
    const body = route.request().postDataJSON?.() ?? {};

    if (method === 'GET') {
      if (currentUser) {
        await route.fulfill({ json: currentUser });
      } else {
        await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
      }
      return;
    }

    if (method === 'PUT') {
      if (!currentUser) {
        await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
        return;
      }

      currentUser = {
        ...currentUser,
        ...body,
        id: Number(body.id ?? currentUser.id),
      };

      await route.fulfill({
        json: {
          user: currentUser,
          token: 'mock-token-123',
        },
      });
    }
  };

  await page.route('*/**/api/user/me', handleUserRoute);
  await page.route('*/**/api/user/*', handleUserRoute);
}

test('updateUser', async ({ page }) => {
    await basicInit(page);
    const email = `user${Math.floor(Math.random() * 10000)}@jwt.com`;
    await page.goto('/');
    await page.getByRole('link', { name: 'Register' }).click();
    await page.getByRole('textbox', { name: 'Full name' }).fill('pizza diner');
    await page.getByRole('textbox', { name: 'Email address' }).fill(email);
    await page.getByRole('textbox', { name: 'Password' }).fill('diner');
    await page.getByRole('button', { name: 'Register' }).click();
    await page.getByRole('link', { name: 'pd' }).click();
    await expect(page.getByRole('main')).toContainText('pizza diner');
    await page.getByRole('button', { name: 'Edit' }).click();
    await expect(page.locator('h3')).toContainText('Edit user');
    await page.getByRole('button', { name: 'Update' }).click();
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    await expect(page.getByRole('main')).toContainText('pizza diner');
    await page.getByRole('button', { name: 'Edit' }).click();
    await expect(page.locator('h3')).toContainText('Edit user');
    await page.getByRole('textbox').first().fill('pizza dinerx');
    await page.getByRole('textbox').nth(1).fill("test@test.com");
    await page.getByRole('textbox').nth(2).fill("123");
    await page.getByRole('button', { name: 'Update' }).click();
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    await expect(page.getByRole('main')).toContainText('pizza dinerx');
    await page.getByRole('link', { name: 'Logout' }).click();
    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByRole('textbox', { name: 'Email address' }).fill("test@test.com");
    await page.getByRole('textbox', { name: 'Password' }).fill('123');
    await page.getByRole('button', { name: 'Login' }).click();
    await page.getByRole('link', { name: 'pd' }).click();
    await expect(page.getByRole('main')).toContainText('pizza dinerx');
    });

test('admin user can edit name', async ({ page }) => {
        await basicInit(page);
        const email = `admin${Math.floor(Math.random() * 10000)}@jwt.com`;
        await page.goto('/');
        await page.getByRole('link', { name: 'Register' }).click();
        await page.getByRole('textbox', { name: 'Full name' }).fill('admin person');
        await page.getByRole('textbox', { name: 'Email address' }).fill(email);
        await page.getByRole('textbox', { name: 'Password' }).fill('admin');
        await page.getByRole('button', { name: 'Register' }).click();
        await page.getByRole('link', { name: 'ap' }).click();
        await expect(page.getByRole('main')).toContainText('admin');
        await page.getByRole('button', { name: 'Edit' }).click();
        await expect(page.locator('h3')).toContainText('Edit user');
        await page.getByRole('textbox').first().fill('admin user');
        await page.getByRole('button', { name: 'Update' }).click();
        await expect(page.locator('[role="dialog"]')).not.toBeVisible();
        await expect(page.getByRole('main')).toContainText('admin user');
    });