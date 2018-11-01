(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){const{runTransform:runTransform}=require("../src/core");const input=ace.edit("input",{mode:"ace/mode/javascript"});input.setTheme("ace/theme/xcode");input.getSession().setUseWrapMode(true);const output=ace.edit("output",{mode:"ace/mode/javascript",readOnly:true});output.setTheme("ace/theme/xcode");output.getSession().setUseWrapMode(true);let options={};function transform(){const inputValue=input.getSession().getValue();try{const outputValue=runTransform(inputValue,options);output.getSession().setValue(outputValue)}catch(err){const errorMessage=err.message.split("\n").map(s=>"// "+s).join("\n");output.getSession().setValue(errorMessage)}}let timeout=false;input.on("input",function(){if(timeout){clearTimeout(timeout)}timeout=setTimeout(function(){transform();timeout=false},500)});const settingsButton=document.getElementById("settings");const optionsForm=document.getElementById("options");settingsButton.addEventListener("click",()=>{optionsForm.classList.toggle("open");const isOpen=optionsForm.classList.contains("open");settingsButton.textContent=isOpen?"❌ Close":"⚙ Settings";if(!isOpen){const data=new FormData(optionsForm);for(const[key,value]of data.entries()){const val=parseInt(value,10);options[key]=val.toString()!=="NaN"?val:value}transform()}});transform()},{"../src/core":2}],2:[function(require,module,exports){module.exports.runTransform=runTransform;let LOOKING_FOR;const DISTANCE=6;const defaultOptions={quote:"double",lenDestructure:60,lenModuleName:20,lenIdentifier:20,indent:2};function runTransform(str,options={}){options={...defaultOptions,...options};options.quote=options.quote==="single"?"'":'"';const buffer=[];const exportBuffer={items:[],requires:[]};let pos=0;for(const token of tokenize(str,options)){buffer.push(str.slice(pos,token.start));buffer.push(transform(token,str,exportBuffer,options));pos=token.end+1}pos=skipNewLines(str,pos);buffer.push(str.slice(pos,str.length));if(exportBuffer.items.length){const indent=" ".repeat(options.indent);for(const item of exportBuffer.requires){buffer.push(item)}buffer.push("\nmodule.exports = {\n");const exportNames=exportBuffer.items.map(item=>`${indent}${item[0]}${item[1]?`: ${item[1]}`:""}`);buffer.push(exportNames.join(",\n"));buffer.push("\n}")}buffer.push("\n");return buffer.join("")}function transform(token,str,exportBuffer,{indent:indent}){indent=" ".repeat(indent);const{type:type}=token;switch(type){case"import":{const identifiers=token.modules.map(s=>s.join(": ")).join(", ");return`const { ${identifiers} } = require(${token.moduleName})`}case"import*":{const{identifier:identifier,moduleName:moduleName}=token;return`const ${identifier} = require(${moduleName})`}case"awaitImport":{return`require(${token.moduleName})`}case"export":{exportBuffer.items.push([token.identifier]);return""}case"reExport":{const{moduleName:moduleName}=token;if(token.modules.length===1){const[original,alias]=token.modules[0];exportBuffer.items.push([alias?alias:original,`require(${moduleName}).${original}`]);return}exportBuffer.requires.push("const {\n");const names=token.modules.map(([original])=>`${indent}${original}: __${original}__`).join(",\n");exportBuffer.requires.push(names);exportBuffer.requires.push(`\n} = require(${moduleName});`);for(const[original,alias]of token.modules){exportBuffer.items.push([alias?alias:original,`__${original}__`])}return""}case"reExportImported":{exportBuffer.items.push(...token.modules);return""}default:throw new Error("should not reach here")}}String.prototype.indexWithin=indexWithin;function*tokenize(str,options){const{quote:quote,lenDestructure:lenDestructure,lenModuleName:lenModuleName,lenIdentifier:lenIdentifier}=options;let start=0;let pos;const types=new Map([["import","import "],["export","export "],["awaitImport","await import("]]);while(types.size!==0){pos=Number.POSITIVE_INFINITY;let type;for(const t of types.keys()){const idx=str.indexOf(types.get(t),start);if(idx===-1){types.delete(t)}else if(idx<pos){pos=idx;type=t}}switch(type){case"import":yield handleImport();break;case"export":yield handleExport();break;case"awaitImport":yield handleAwaitImport();break}}function handleImport(){LOOKING_FOR="import names";const braceStart=str.indexWithin("{",pos+7,DISTANCE,false);if(braceStart===-1){return handleImportStar()}const braceEnd=str.indexWithin("}",braceStart+1,lenDestructure);LOOKING_FOR="name of imported module";let moduleStart=str.indexWithin("from ",braceEnd+1,DISTANCE);moduleStart=str.indexWithin(quote,moduleStart+1,5);const moduleEnd=str.indexWithin(quote,moduleStart+1,lenModuleName);start=moduleEnd+1;return{type:"import",start:pos,end:moduleEnd,modules:destructureModules(str.slice(braceStart,braceEnd+1)),moduleName:str.slice(moduleStart,moduleEnd+1)}}function handleAwaitImport(){LOOKING_FOR="name of imported module for await import()";const moduleStart=str.indexWithin("(",pos+12,10)+1;const moduleEnd=str.indexWithin(")",moduleStart+1,lenIdentifier)-1;start=moduleEnd+2;return{type:"awaitImport",start:pos,end:moduleEnd+1,moduleName:str.slice(moduleStart,moduleEnd+1)}}function handleExport(){LOOKING_FOR="export pattern";const skipStart=pos+"export ".length;if(str.indexWithin("{",skipStart,5,false)!==-1){return handleReExport()}else if(str.indexWithin("*",skipStart,5,false)!==-1){return handleExportStar()}LOOKING_FOR="identifier type (function|class|const) for export";const typeEnd=str.indexWithin(" ",skipStart,9);const exportType=str.slice(skipStart,typeEnd);LOOKING_FOR="export identifiers";const identifierStart=str.indexWithin(" ",skipStart+exportType.length,5)+1;const identifierEnd=str.indexWithin(exportType==="function"?"(":" ",identifierStart,lenIdentifier)-1;const end=pos+6;start=end+1;return{type:"export",start:pos,end:end,identifier:str.slice(identifierStart,identifierEnd+1)}}function handleImportStar(){LOOKING_FOR="import name for import*";const identifierStart=str.indexWithin("* as ",pos+7,DISTANCE)+5;const identifierEnd=str.indexWithin(" ",identifierStart+1,lenIdentifier);LOOKING_FOR="name of imported module for import*";let moduleStart=str.indexWithin("from ",identifierEnd+1)+"from".length;moduleStart=str.indexWithin(quote,moduleStart+1);const moduleEnd=str.indexWithin(quote,moduleStart+1,lenModuleName);start=moduleEnd+1;return{type:"import*",start:pos,end:moduleEnd,identifier:str.slice(identifierStart,identifierEnd),moduleName:str.slice(moduleStart,moduleEnd+1)}}function handleReExport(){LOOKING_FOR="export pattern for re-export";const braceStart=str.indexWithin("{",pos+"export ".length,5);const braceEnd=str.indexWithin("}",braceStart+1,lenDestructure);LOOKING_FOR="name of re-exported module";let moduleStart=str.indexWithin("from ",braceEnd+1,10,false);if(moduleStart===-1){const end=skipNewLines(str,braceEnd);start=end+1;return{type:"reExportImported",start:pos,end:end,modules:destructureModules(str.slice(braceStart,braceEnd+1))}}moduleStart=str.indexWithin(quote,moduleStart,"from ".length+4);const moduleEnd=str.indexWithin(quote,moduleStart+1,lenModuleName);const end=skipNewLines(str,moduleEnd);start=end+1;return{type:"reExport",start:pos,end:end,modules:destructureModules(str.slice(braceStart,braceEnd+1)),moduleName:str.slice(moduleStart,moduleEnd+1)}}function handleExportStar(){throw new Error("not implemented")}function destructureModules(objLiteral){return objLiteral.trim().slice(1,-1).split(/,\s*/).map(i=>i.trim()).filter(i=>i).map(i=>i.split(/\s*as\s*/))}}function indexWithin(needle,from,within=99,throws=true){for(let i=from,L=from+within,j=0;i<L;++i){if(this.charCodeAt(i)===needle.charCodeAt(j)){while(j<needle.length){if(this.charCodeAt(i+j)===needle.charCodeAt(j)){++j}else{j=0;break}}if(j===needle.length){return i}}}if(throws){throw new Error(`ParseError: Failed to find \`${needle}\` within ${within} characters from position ${from}`+(LOOKING_FOR?` while looking for ${LOOKING_FOR}`:"")+"\n\nINPUT STRING:"+`\n${"*".repeat(20)}\n`+this+`\n${"*".repeat(20)}\n`)}else{return-1}}function skipNewLines(str,i){if(str.charAt(i+1)===";")++i;while(i<str.length&&/\s/.test(str.charAt(i))){++i}return i}},{}]},{},[2,1]);