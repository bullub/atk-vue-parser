/**
 * 作者: bullub
 * 日期: 2016/11/30 16:32
 * 用途: 用于atk解析vue组件的依赖，多页模式
 */
"use strict";
const path = require("path");
const fs = require("fs");

const AtkUtils = require("atk").AtkUtils;

/**
 * 自定义指令解析器,解析.vue引用
 * @param matchedCmd {String} 匹配到的指令全貌,如 <!--aladdin vue="value"-->
 * @param cmdName {String} 指令名称,示例中是mydirective
 * @param cmdValue {String} 指令值, 示例中是value
 * @param contents {String} 文件内容
 * @param index {Number} 指令所在内容中的索引
 * @returns {string} 解析之后的模板内容
 */
function VueParser(matchedCmd, cmdName, cmdValue, contents, index) {
    let {
        opts,
        file,
        includePaths,
        fileDir,
        filePath,
        basePath,
        extName,
        cmdValueList
    } = AtkUtils.getMustConfigs(this, cmdName, cmdValue);

    //从指令中解析出包含的文件绝对路径
    let includeScriptFiles = AtkUtils.getIncludeAbsoluteFilePaths(includePaths, cmdValueList, extName, basePath);
    let replaceContents = '';

    AtkUtils.fileIterator({
        context: this,
        files: includeScriptFiles,
        filePath,
        index,
        contents,
        directiveName: opts.directiveName,
        basePath,
        matchedCmd
    }, function (vuePath, realFile) {
        //是否真的存在文件
        if(realFile) {
            //解析vue模块的依赖关系
            replaceContents += applyVueDeps(path.dirname(vuePath), vuePath, fileDir);
        }

        replaceContents += `<script src="${path.relative(fileDir, convertVueExtension(vuePath))}"></script>`;
    });

    return replaceContents;
}

function applyVueDeps(vueBase, vuePath, fileDir) {
    let vueContent = fs.readFileSync(vuePath).toString("utf-8");

    let deps = '';

    vueContent.replace(/^\s*import\s+([^\s]+)\s+from\s+([^;\n]+)[\s;]+?$/mg,
        function (matchedLine, variableName, depVuePath, index, contents) {

            var absDepPath = path.resolve(vueBase, depVuePath);

            if(fs.existsSync(absDepPath)) {
                deps += applyVueDeps(path.dirname(absDepPath), absDepPath, fileDir);
            }

            deps += `<script src="${path.relative(fileDir, convertVueExtension(absDepPath))}"></script>`;

            return matchedLine;
        });

    return deps;
}

function convertVueExtension(vuePath) {
    return vuePath.replace(/\.vue$/, ".js");
}

module.exports = VueParser;