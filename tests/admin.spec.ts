import { Page } from '@playwright/test';
import { test, expect } from 'playwright-test-coverage';
import { Role, User } from '../src/service/pizzaService';

async function basicInit(page: Page) {
  let loggedInUser: User | undefined;
  const validUsers: Record<string, User> = { 
    'a@jwt.com': { 
      id: '1', 
      name: 'pizza admin', 
      email: 'a@jwt.com', 
      password: 'admin', 
      roles: [{ role: Role.Admin }] 
    } 
  };

  // Authorize login for the given user
  await page.route('*/**/api/auth', async (route) => {
    const loginReq = route.request().postDataJSON();
    const user = validUsers[loginReq.email];
    if (!user || user.password !== loginReq.password) {
      await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
      return;
    }
    loggedInUser = validUsers[loginReq.email];
    const loginRes = {
      user: {
        id: 1,
        name: loggedInUser.name,
        email: loggedInUser.email,
        roles: [{ role: 'admin' }]
      },
      token: 'admin-token-12345',
    };
    expect(route.request().method()).toBe('PUT');
    await route.fulfill({ json: loginRes });
  });

  // Return the currently logged in user
  await page.route('*/**/api/user/me', async (route) => {
    expect(route.request().method()).toBe('GET');
    if (loggedInUser) {
      const userResponse = {
        id: 1,
        name: loggedInUser.name,
        email: loggedInUser.email,
        roles: [{ role: 'admin' }]
      };
      await route.fulfill({ json: userResponse });
    } else {
      await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
    }
  });

  // Admin franchise list endpoint - handle query parameters
  await page.route('*/**/api/franchise**', async (route) => {
    const url = new URL(route.request().url());
    const searchParams = url.searchParams;
    const name = searchParams.get('name') || '*';
    const page_num = parseInt(searchParams.get('page') || '0');
    const limit = parseInt(searchParams.get('limit') || '3');
    
    // All available franchises (more than 3 to enable pagination)
    let allFranchises = [
      {
        "id": "1",
        "name": "pizzaPocket",
        "admins": [
          {
            "id": "3",
            "name": "pizza franchisee",
            "email": "f@jwt.com"
          }
        ],
        "stores": [
          {
            "id": "1",
            "name": "SLC",
            "totalRevenue": 0.309
          },
          {
            "id": "8",
            "name": "Test Store",
            "totalRevenue": 0
          },
          {
            "id": "43",
            "name": "Leo",
            "totalRevenue": 0
          },
          {
            "id": "44",
            "name": "Leo",
            "totalRevenue": 0
          }
        ]
      },
      {
        "id": "52",
        "name": "test",
        "admins": [
          {
            "id": "156",
            "name": "admin",
            "email": "a@jwt.com"
          }
        ],
        "stores": []
      },
      {
        "id": "2",
        "name": "Test Franchise",
        "admins": [
          {
            "id": "37",
            "name": "a922jlj3ig",
            "email": "a922jlj3ig@admin.com"
          }
        ],
        "stores": []
      },
      {
        "id": "31",
        "name": "Test Franchise jljypaqx0o",
        "admins": [
          {
            "id": "100",
            "name": "wvp158i3b5",
            "email": "wvp158i3b5@admin.com"
          }
        ],
        "stores": [
          {
            "id": "22",
            "name": "Test Store 123",
            "totalRevenue": 0
          }
        ]
      }
    ];

    // Filter by name if not wildcard
    if (name !== '*' && name !== '') {
      allFranchises = allFranchises.filter(f => 
        f.name.toLowerCase().includes(name.toLowerCase())
      );
    }

    // Implement pagination
    const startIndex = page_num * limit;
    const endIndex = startIndex + limit;
    const franchises = allFranchises.slice(startIndex, endIndex);
    const hasMore = endIndex < allFranchises.length;

    const franchiseListResponse = {
      "franchises": franchises,
      "more": hasMore
    };
    
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: franchiseListResponse });
  });

  // Admin create franchise endpoint
  await page.route('*/**/api/franchise', async (route) => {
    if (route.request().method() === 'POST') {
      const createRes = {
        "stores": [],
        "id": 57,
        "name": "test2",
        "admins": [
          {
            "email": "a@jwt.com",
            "id": 156,
            "name": "admin"
          }
        ]
      };
      await route.fulfill({ json: createRes });
    }
  });

  // Delete store endpoint
  await page.route('*/**/api/franchise/*/store/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({ json: { "message": "store deleted" } });
    }
  });

  // Delete franchise endpoint
  await page.route('*/**/api/franchise/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({ json: { "message": "franchise deleted" } });
    }
  });

  await page.goto('/');
}
test('admin dashboard page', async ({ page }) => {
  await basicInit(page);
  await page.goto('http://localhost:5173/');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('a@jwt.com');
  await page.getByRole('textbox', { name: 'Email address' }).press('Tab');
  await page.getByRole('textbox', { name: 'Password' }).fill('admin');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('link', { name: 'Admin' }).click();
  await expect(page.locator('h2')).toContainText('Mama Ricci\'s kitchen');
  await page.getByRole('button', { name: '»' }).click();
  await page.getByRole('button', { name: '«' }).click();
  await page.getByRole('textbox', { name: 'Filter franchises' }).click();
  await page.getByRole('textbox', { name: 'Filter franchises' }).fill('pizzaPocket');
  await page.getByRole('button', { name: 'Search Franchises' }).click();
});

test('admin dashboard create franchise', async ({ page }) => {
  await basicInit(page);
  await page.goto('http://localhost:5173/');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('a');
  await page.getByRole('textbox', { name: 'Email address' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('a@jwt.com');
  await page.getByRole('textbox', { name: 'Email address' }).press('Tab');
  await page.getByRole('textbox', { name: 'Password' }).fill('admin');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('link', { name: 'Admin' }).click();
  await page.getByRole('button', { name: 'Add Franchise' }).click();
  await page.getByRole('textbox', { name: 'franchise name' }).click();
  await page.getByRole('textbox', { name: 'franchise name' }).fill('test');
  await page.getByRole('textbox', { name: 'franchisee admin email' }).click();
  await page.getByRole('textbox', { name: 'franchisee admin email' }).fill('a@jwt.com');
  await page.getByRole('button', { name: 'Create' }).click();
  await page.getByRole('button', { name: '»' }).click();
  await page.getByRole('button', { name: '«' }).click();
  await page.getByRole('cell', { name: 'test', exact: true }).click();
  await expect(page.getByRole('main')).toContainText('test');
});
test("admin dashboard close franchise and store", async ({ page }) => {
  await basicInit(page);
  await page.goto('http://localhost:5173/');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('a@jwt.com');
  await page.getByRole('textbox', { name: 'Email address' }).press('Tab');
  await page.getByRole('textbox', { name: 'Password' }).fill('admin');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('link', { name: 'Admin' }).click();
  await page.getByRole('row', { name: 'SLC 0.309 ₿ Close' }).getByRole('button').click();
  await expect(page.getByRole('main')).toContainText('Are you sure you want to close the pizzaPocket store SLC ? This cannot be restored. All outstanding revenue will not be refunded.');
  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('row', { name: 'pizzaPocket pizza franchisee' }).getByRole('button').click();
  await expect(page.getByRole('main')).toContainText('Are you sure you want to close the pizzaPocket franchise? This will close all associated stores and cannot be restored. All outstanding revenue will not be refunded.');
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('main')).toContainText('Test Franchise');
});