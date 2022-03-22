import path from "path";
import fs from "fs/promises";
import { format } from "prettier";
import { ChainId, BlockExplorer, Contracts } from "./types";

const README_PATH = path.resolve(__dirname, "..", "README.md");
var chain_name = "Mainnet";
var contract_name = "MysteryBox";

async function main() {
  //We'll read argument from command line to get chain name and contract name
  //If you input the non-supported chain or contract name, it'll throw an error 
  if (process.argv.length != 4) throw `Expected 2 argument but got ${process.argv.length-2}`; 
  chain_name = process.argv[2];
  contract_name = process.argv[3];
  if (!Contracts.includes(contract_name)) throw "Not support contract";
  if (!Object.keys(ChainId).includes(chain_name)) throw "Not support chain";
  const content = await fs.readFile(README_PATH, "utf-8");
  const old_address_table = find_table(content, contract_name);
  const new_line = form_new_line();
  const new_address_table = old_address_table.concat(new_line);
  const replaced_content = replace(
    content,
    contract_name,
    new_address_table
  );
  const formatted = format(replaced_content, {
    parser: "markdown",
  });
  await fs.writeFile(README_PATH, formatted, "utf-8");
}

main();

function form_new_line() {
  const required_chainId = getEnumAsArray(ChainId).get(chain_name);
  const file_name = "unknown-" + required_chainId + ".json";
  const oz_file_path = path.resolve(__dirname,"..", ".openzeppelin", file_name);
  const contract_address_json = require(oz_file_path);
  const contract_address = contract_address_json["proxies"][0]["address"];
  const browser_path = BlockExplorer.get(chain_name) + `${contract_address}`;
  const new_address_line = `| ${chain_name} | [${contract_address}](${browser_path}) |\n`;
  return new_address_line;
}

function find_table(content: string, name: string) {
  const pattern = new RegExp(
    `(<!-- begin ${name} -->)(.+)(<!-- end ${name} -->)`,
    "gs"
  );
  const address_table = content.match(pattern)![0];
  return address_table.replace(pattern, "$2");
}

function replace(content: string, name: string, replaced: string) {
  const pattern = new RegExp(
    `(<!-- begin ${name} -->)(.+)(<!-- end ${name} -->)`,
    "gs"
  );
  return content.replace(pattern, `$1${replaced}$3`);
} 

function getEnumAsArray<T extends object> (enumObject: T) {
  const keys = Object.keys(enumObject).filter((x) => Number.isNaN(Number.parseInt(x)));
  const map = new Map();
  for(let i = 0; i < keys.length; i ++) {
    map.set(keys[i], enumObject[keys[i] as keyof T]);
  }
  return map;
}
