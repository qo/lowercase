import {readFile, writeFile} from "fs/promises";
import {readdirSync} from "fs";
import path from "path";

const prompts = require('prompts');

// Lowercase string but leave parts that match regex unchanged
function lowercaseStringExceptRegex(string: string, regex: RegExp): string {

    let result = "";
    const matches = string.match(regex);
    if (!matches) return string.toLowerCase();

    for (const match of string.match(regex) as string[]) {
        const partBeforeMatch = string.slice(
            result.length,
            string.indexOf(match, result.length)
        ).toLowerCase();
        result += partBeforeMatch + match;
    }

    return result;
}

(async function () {

    const csgoPathInput = await prompts({
        type: 'text',
        name: 'value',
        message: 'provide path to csgo folder',
    });
    const csgoPath = csgoPathInput.value;

    const pathToLanguageFiles = path.join(csgoPath, "csgo", "resource");

    const languageFilenames = readdirSync(pathToLanguageFiles).filter(
        filename =>
            filename.startsWith("csgo_")
            &&
            path.extname(filename) === ".txt"
    );

    const languages = languageFilenames.map(
        languageFilename => path.parse(languageFilename).name.slice("csgo_".length)
    );

    const languageChoices = languages.map(
        language => ({ title: language, value: language })
    );

    const languageInput = await prompts({
        type: 'select',
        name: 'value',
        message: 'select csgo language',
        choices: languageChoices
    });
    const language = languageInput.value;

    const input = await readFile(
        path.join(
            pathToLanguageFiles,
            `csgo_${language}.txt`),
        "utf16le");

    const tokensStart = 44;
    const tokensString = input.slice(input.indexOf("{", tokensStart), input.lastIndexOf("}"));
    const tokens = tokensString.split(/"[\s]*\n/g);

    const tokensWithValuesLowercased = tokens.map(
        token => {
            // index on which value starts
            const value_index = token.lastIndexOf("\"");
            const key = token.slice(0, value_index);
            const value = token.slice(value_index);

            const paramRegex = /{.+?:.+?}/g;
            const valueContainsParams = paramRegex.test(value);
            if (!valueContainsParams) return key + value.toLowerCase();

            return key + lowercaseStringExceptRegex(value, paramRegex);
        }
    );

    const output =
        input.slice(0, tokensStart)
        +
        tokensWithValuesLowercased.join("\"\r\n")
        +
        "}\r\n\r\n\r\n";

    const lowercaseFilename = `csgo_${language}_lowercase.txt`;
    await writeFile(path.join(pathToLanguageFiles, lowercaseFilename), output, "utf16le");

    console.log(
        `\x1b[32m√\x1b[97m put this in your launch options: \x1b[94m-language ${language}_lowercase\x1b[97m`
    );

})();