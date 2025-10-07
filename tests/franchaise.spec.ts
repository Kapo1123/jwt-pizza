import { Page } from '@playwright/test';
import { test, expect } from 'playwright-test-coverage';
import { Role, User } from '../src/service/pizzaService';

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
        id: 3,
        name: loggedInUser.name,
        email: loggedInUser.email,
        roles: [{ objectId: 1, role: 'franchisee' }]
      },
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywibmFtZSI6InBpenphIGZyYW5jaGlzZWUiLCJlbWFpbCI6ImZAand0LmNvbSIsInJvbGVzIjpbeyJvYmplY3RJZCI6MSwicm9sZSI6ImZyYW5jaGlzZWUifV0sImlhdCI6MTc1OTgyMzgxNX0.jTmifAQOFdKNhSg6I1TY2Pw6wbFayIUI6QqBG8W2GZg',
    };
    expect(route.request().method()).toBe('PUT');
    await route.fulfill({ json: loginRes });
  });

  // Return the currently logged in user
  await page.route('*/**/api/user/me', async (route) => {
    expect(route.request().method()).toBe('GET');
    if (loggedInUser) {
      const userResponse = {
        id: 3,
        name: loggedInUser.name,
        email: loggedInUser.email,
        roles: [{ objectId: 1, role: 'franchisee' }]
      };
      await route.fulfill({ json: userResponse });
    } else {
      await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
    }
  });

  // Get franchise data - calls /api/franchise/${user.id}
  await page.route('*/**/api/franchise/3', async (route) => {
    const franchiseArray = [
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
          }
        ]
      }
    ];
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: franchiseArray });
  });

  // Handle store creation
  await page.route('*/**/api/franchise/1/store', async (route) => {
    const storeReq = route.request().postDataJSON();
    const storeRes = {
      id: "43",
      franchiseId: "1",
      name: storeReq.name
    };
    expect(route.request().method()).toBe('POST');
    await route.fulfill({ json: storeRes });
    
    // Update the franchise route to include the new store
    await page.route('*/**/api/franchise/3', async (newRoute) => {
      const updatedFranchiseArray = [
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
              "name": storeReq.name,
              "totalRevenue": 0
            }
          ]
        }
      ];
      expect(newRoute.request().method()).toBe('GET');
      await newRoute.fulfill({ json: updatedFranchiseArray });
    });
  });

  await page.goto('/');
}

test('franchise dashboard and create store', async ({ page }) => {
    await basicInit(page);
    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByRole('textbox', { name: 'Email address' }).fill('f@jwt.com');
    await page.getByRole('textbox', { name: 'Password' }).fill('a');
    await page.getByRole('button', { name: 'Login' }).click();

    // Wait a moment for the page to update after login
    await page.waitForTimeout(500);
    
    // Wait for login to complete - the Login link should disappear
    await expect(page.getByRole('link', { name: 'Login' })).not.toBeVisible();
    
    
    await page.getByLabel('Global').getByRole('link', { name: 'Franchise' }).click();
    await expect(page.getByRole('heading', { name: 'pizzaPocket' })).toBeVisible();
    await expect(page.getByRole('main')).toContainText('Everything you need to run an JWT Pizza franchise');
    await expect(page.getByRole('main')).toContainText('SLC');
    await expect(page.getByRole('main')).toContainText('0.309 ₿');
    await expect(page.getByRole('main')).toContainText('Test Store');
    await expect(page.getByRole('main')).toContainText('0 ₿');
    await page.getByRole('button', { name: 'Create store' }).click();
    await page.getByRole('textbox', { name: 'store name' }).fill('Leo');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('main')).toContainText('Leo');
});