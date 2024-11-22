const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const { marked } = require('marked'); // 使用新的导入方式
const { mkdir, rm, readdir, readFile, writeFile, copyFile } = fs.promises;
const yaml = require('js-yaml');

// 解析配置文件 config.yml
const parseConfig = () => {
	const filePath = path.join(__dirname, 'config.yml');
	// 读取 YAML 文件
	const readYamlFile = () => {
		try {
			const fileContents = fs.readFileSync(filePath, 'utf-8');
			const data = yaml.load(fileContents);
			return data;
		} catch (e) {
			console.error(e);
			throw new Error(`Error parsing YAML file: ${e.message}`);
		}
	};
	// 解析 YAML 文件
	const config = readYamlFile();
	return config;
};

// 读取 Markdown 文件
const readMarkdownFile = async filePath => {
	return await readFile(filePath, 'utf-8');
};

// 将 Markdown 转换为 HTML
const markdownToHtml = markdown => {
	return marked.parse(markdown);
};

// 渲染 EJS 模板
const renderTemplate = async (templatePath, data) => {
	const template = await readFile(templatePath, 'utf-8');
	return ejs.render(template, data);
};

// 创建 dist 目录
const createDistDir = async dirPath => {
	try {
		await mkdir(dirPath, { recursive: true });
	} catch (error) {
		console.error(`Error creating directory: ${error.message}`);
		throw error;
	}
};

// 清除 dist 目录
const clearDistDir = async dirPath => {
	try {
		const files = await readdir(dirPath);
		for (const file of files) {
			await rm(path.join(dirPath, file), { recursive: true, force: true });
		}
	} catch (error) {
		console.error(`Error clearing directory: ${error.message}`);
		throw error;
	}
};

// 复制文件
const copyFileToDist = async (sourcePath, destPath) => {
	try {
		await copyFile(sourcePath, destPath);
	} catch (error) {
		console.error(`Error copying file: ${error.message}`);
		throw error;
	}
};

// 生成静态页面
const generatePage = async (contentPath, outputPath, templatePath, data) => {
	try {
		const markdownContent = await readMarkdownFile(contentPath);
		const htmlContent = markdownToHtml(markdownContent);
		const renderedHtml = await renderTemplate(templatePath, { ...data, content: htmlContent });

		await writeFile(outputPath, renderedHtml, 'utf-8');
		console.log(`Generated page: ${outputPath}`);
	} catch (error) {
		console.error(`Error generating page: ${error.message}`);
		throw error;
	}
};

// 配置
const contentPath1 = path.join(__dirname, 'src/content/page1.md');
const contentPath2 = path.join(__dirname, 'src/content/page2.md');
const outputPath1 = path.join(__dirname, 'dist/index.html');
const outputPath2 = path.join(__dirname, 'dist/page2.html');
const templatePath = path.join(__dirname, 'src/templates/index.ejs');
const mainCssPath = path.join(__dirname, 'src/css/index.css');
const outMainCssPath = path.join(__dirname, 'dist/css/index.css');
const data = {
	title: 'My Static Site',
	config: parseConfig()
};

// 主程序
(async () => {
	try {
		// 创建或清空 dist 目录
		await createDistDir(path.dirname(outputPath1));
		await clearDistDir(path.dirname(outputPath1));

		// 复制 CSS 文件
		await createDistDir(path.dirname(outMainCssPath));
		await copyFileToDist(mainCssPath, outMainCssPath);

		// 生成静态页面
		await generatePage(contentPath1, outputPath1, templatePath, data);
		await generatePage(contentPath2, outputPath2, templatePath, data);
	} catch (error) {
		console.error(`Error in main program: ${error.message}`);
	}
})();
