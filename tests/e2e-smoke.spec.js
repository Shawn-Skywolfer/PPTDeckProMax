const { test, expect } = require('@playwright/test');

test('应用可以加载并创建项目', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('text=创建你的 Deck 项目')).toBeVisible();

  page.once('dialog', async (dialog) => {
    await dialog.accept('自动化测试项目');
  });

  await page.getByRole('button', { name: '新建项目' }).click();

  await expect(page.locator('#step-title')).toContainText('初始化项目');
  await expect(page.locator('#project-select')).toHaveValue(/proj_/);
});

test('预览标签和导出入口可见', async ({ page }) => {
  await page.goto('/');

  const previewTabs = ['Markdown', '幻灯片', 'JSON', '图片'];
  for (const tab of previewTabs) {
    await expect(page.getByRole('button', { name: tab })).toBeVisible();
  }

  await page.getByRole('button', { name: '导出产物' }).click();
  await expect(page.locator('text=PPTX 演示文稿')).toBeVisible();
});
