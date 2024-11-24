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

// 创建目录
const createDistDir = async path => {
	try {
		await mkdir(path, { recursive: true });
	} catch (error) {
		console.error(`Error creating directory: ${error.message}`);
		throw error;
	}
};

// 清除 dist 目录
const clearDistDir = async () => {
	try {
		const files = await readdir(path.join(__dirname, 'dist'));
		for (const file of files) {
			await rm(path.join(path.join(__dirname, 'dist'), file), { recursive: true, force: true });
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

// 递归复制目录
const copyDirectory = async (sourceDir, targetDir) => {
	try {
		await createDistDir(targetDir);
		const entries = await readdir(sourceDir, { withFileTypes: true });

		for (const entry of entries) {
			const sourcePath = path.join(sourceDir, entry.name);
			const targetPath = path.join(targetDir, entry.name);

			if (entry.isDirectory()) {
				await copyDirectory(sourcePath, targetPath);
			} else {
				await copyFileToDist(sourcePath, targetPath);
			}
		}
	} catch (error) {
		console.error(`Error copying directory: ${error.message}`);
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

// 读取目录中的文件
const readDirectory = async directoryPath => {
	try {
		const files = await readdir(directoryPath);
		return files;
	} catch (err) {
		console.error('目录读取失败: ' + err);
	}
};

// 入口函数
const main = async () => {
	const data = {
		config: parseConfig()
	};
	// 创建打包目录
	await createDistDir(path.join(__dirname, 'dist'));
	// 移除上次打包结果
	await clearDistDir();

	// 复制 src 目录下的文件和文件夹，排除 templates 和 pages 目录
	const srcDir = path.join(__dirname, 'src');
	const distDir = path.join(__dirname, 'dist');

	const entries = await readdir(srcDir, { withFileTypes: true });

	for (const entry of entries) {
		const sourcePath = path.join(srcDir, entry.name);
		const targetPath = path.join(distDir, entry.name);

		if (entry.isDirectory() && !['templates', 'pages'].includes(entry.name)) {
			await copyDirectory(sourcePath, targetPath);
		} else if (entry.isFile()) {
			await copyFileToDist(sourcePath, targetPath);
		}
	}

	// 读取 pages 目录
	const pagesDir = path.join(__dirname, 'src/pages');
	const pagesFiles = await readDirectory(pagesDir);
	for (const item of pagesFiles) {
		const pagePath = path.join(__dirname, `src/pages/${item}`);
		const menuFind = data.config.menu.find(menuItem => menuItem.path === item.split('.')[0]);
		const outPath = `dist/${menuFind.path}.html`;
		const templatePath = path.join(__dirname, `src/templates/${menuFind.renderTemplates}.ejs`);
		await generatePage(pagePath, outPath, templatePath, data);
	}
};

main();
