import { test, expect, APIRequestContext } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { Login } from './pageobjects/login';
import { Tasks } from './pageobjects/tasks';
import { User } from './types/user';
import { Task } from './types/task';

// Request context is reused by all tests in the file.
let apiContext: APIRequestContext;

test.beforeAll(async ({ playwright }) => {
  apiContext = await playwright.request.newContext({
    // All requests we send go to this API endpoint.
    baseURL: 'https://task-mgmt-charlyautomatiza.herokuapp.com',
    extraHTTPHeaders: {
      Accept: 'application/json',
    },
  });
});

test.afterAll(async () => {
  // Dispose all responses.
  await apiContext.dispose();
});

/**
 * This test is a simple smoke test.
*/
test('API SignUp | Login UI', async ({ page }) => {
  const username = faker.internet.userName() + faker.random.numeric(2);
  const password = faker.internet.password();

  // New User
  const newUser = await apiContext.post('/auth/signup', {
    data: {
      username,
      password,
    },
  });
  expect(newUser.ok()).toBeTruthy();

  const login = new Login(page);
  await login.goto();
  await login.sigIn(username, password);
  await page.waitForURL('**\/tasks');
});

/**
 * Sign up, login, and create a new task by API calls.
 * Login and find the new task in the list.
 */
test('API: SignUp, Create Task | UI: Login, Find a task', async ({ page }) => {
  const username = faker.internet.userName() + faker.random.numeric(2);
  const password = faker.internet.password();

  // New User
  const newUser = await apiContext.post('/auth/signup', {
    data: {
      username,
      password,
    },
  });
  expect(newUser.ok()).toBeTruthy();
  // Login
  const loginUser = await apiContext.post('/auth/signin', {
    data: {
      username,
      password,
    },
  });
  expect(loginUser.ok()).toBeTruthy();

  const userData: User = <User> await loginUser.json();
  // Create a new task
  const title = faker.lorem.sentence(2);
  const description = faker.lorem.sentence(5);
  const newTask = await apiContext.post('/tasks', {
    headers: {
      Authorization: `Bearer ${userData.accessToken}`,
    },
    data: {
      title,
      description,
    },
  });
  expect(newTask.ok()).toBeTruthy();

  // Get the list of tasks
  const getTasks = await apiContext.get('/tasks', {
    headers: {
      Authorization: `Bearer ${userData.accessToken}`,
    },
  });
  expect(getTasks.ok()).toBeTruthy();

  const userTasks: Task[] = <Task[]> await getTasks.json();

  // Find the new task in the UI
  const login = new Login(page);
  const tasks = new Tasks(page);
  await login.goto();
  await login.sigIn(username, password);
  await page.waitForURL('**\/tasks');
  await tasks.findTask(title);
  await page.waitForLoadState('networkidle');
  const taskUi = await tasks.getTaskTitle();
  // Compare the title
  expect(userTasks[0].title).toContain(taskUi);
});
