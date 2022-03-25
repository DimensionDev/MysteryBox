import path from "path";
import fs from "fs/promises";
import { format } from "prettier";
import { ChainId, BlockExplorer, Contracts } from "./types";

const README_PATH = path.resolve(__dirname, "..", "README.md");
var chain_name = "Mainnet";
var contract_name = "MysteryBox";

async function main() {
  // We'll read argument from command line to get chain name and contract name
  // If you input the non-supported chain or non-listed contract name, it'll throw an error
  if (process.argv.length != 4) throw `Expected 2 argument but got ${process.argv.length - 2}`;
  chain_name = process.argv[2];
  contract_name = process.argv[3];
  if (!Contracts.includes(contract_name)) throw "Not listed contract";
  if (!Object.keys(ChainId).includes(chain_name)) throw "Not supported chain";
  const content = await fs.readFile(README_PATH, "utf-8");
  var old_address_table = scanTable(content, contract_name);
  const new_line_info = getNewLine(old_address_table);
  old_address_table[chain_name] = new_line_info.slice(0, 4);
  const table_replace = replace(
    content,
    contract_name,
    "table",
    Array.from(makeMainTable(old_address_table)).join("\n")
  );
  const formatted_table = format(table_replace, {
    parser: "markdown",
    printWidth: 160,
  });
  var link_table = scanLinks(content, contract_name);
  const tag = (contract_name == "MysteryBox") ? "mb" : "nft"
  link_table[`${tag}-${chain_name.toLowerCase()}`] = new_line_info[4];
  const link_replaced = replace(
    formatted_table,
    contract_name,
    "link",
    Array.from(makeMainLink(link_table)).join("\n")
  );
  const formatted_link = format(link_replaced, {
    parser: "markdown",
    printWidth: 160,
  });
  await fs.writeFile(README_PATH, formatted_link, "utf-8");
}

main();

function* makeMainLink(link_table: object) {
  for (let key in link_table) {
    let value = link_table[key as keyof object];
    yield `[${key}]: ${value}`;
  }
}

function* makeMainTable(address_table: object) {
  yield "| Chain | MysteryBox | MaskTestNFT |";
  yield "| - | - | - |";
  for (let key in address_table) {
    let value = address_table[key as keyof object];
    var line = `| ${key} |`
    for (let i = 0; i < 4; i = i + 2) {
      if (value[i] == '') {
        line = line + " |";
      } else {
        line = line + ` [${value[i]}][${value[i + 1]}]|`;
      }
    }
    yield line;
  }
}

function getNewLine(address_table: object) {
  const required_chainId: ChainId = getEnumAsArray(ChainId).get(chain_name);
  const oz_file_path = path.resolve(__dirname, "..", ".openzeppelin", `unknown-${required_chainId}.json`);
  const contract_address_json = require(oz_file_path);
  // Here the index '0' for `contract_address_json["proxies"]` points to MysteryBox Contract.
  // If you need to update the other contract please select proper index according to your deployment order.
  const contract_address: string = contract_address_json["proxies"][0]["address"];
  const browser_path = BlockExplorer[required_chainId](contract_address);
  const address_display = contract_address.substr(0, 10);
  if (contract_name == "MysteryBox") {
    const link_tag = `mb-${chain_name.toLowerCase()}`;
    if (address_table[chain_name as keyof object] == undefined) {
      return new Array(address_display, link_tag, '', '', browser_path);
    } else {
      const nft_address = address_table[chain_name as keyof object][2];
      const nft_link = address_table[chain_name as keyof object][3];
      return new Array(address_display, link_tag, nft_address, nft_link, browser_path);
    }

  } else if (contract_name == "MaskTestNFT") {
    const link_tag = `nft-${chain_name.toLowerCase()}`;
    if (address_table[chain_name as keyof object] == undefined) {
      return new Array('', '', address_display, link_tag, browser_path);
    } else {
      const mb_addr = address_table[chain_name as keyof object][0];
      const mb_link = address_table[chain_name as keyof object][1];
      return new Array(mb_addr, mb_link, address_display, link_tag, browser_path);
    }
  }
  return new Array('', '', '', '', '');
}

function scanTable(content: string, name: string) {
  const main_contract_table = Contracts.slice(0, 2);
  const table_name = main_contract_table.includes(name) ? "main" : "qualification";
  const pattern = new RegExp(
    `(<!-- begin ${table_name} table-->)(.+)(<!-- end ${table_name} table-->)`,
    "gs"
  );
  content.match(pattern);
  const address_table = RegExp.$2;
  var table_dict: { [key: string]: Object } = {};
  const single_lines = address_table.trim().split("\n");
  for (let i = 0; i < single_lines.length; i++) {
    if (i < 2) continue;
    const element = single_lines[i].trim().split("|");
    if (element.length == 1) continue;
    const chain = element[1].trim();
    const mb_info = parseElement(element[2]);
    const mb_addr = mb_info[0];
    const mb_link_name = mb_info[1];
    const nft_info = parseElement(element[3]);
    const nft_address = nft_info[0];
    const nft_link_name = nft_info[1];
    const address_info = new Array(mb_addr, mb_link_name, nft_address, nft_link_name);
    table_dict[chain] = address_info;
  }
  return table_dict;
}

function scanLinks(content: string, name: string) {
  const main_contracts = Contracts.slice(0, 2);
  const table_name = main_contracts.includes(name) ? "main" : "qualification";
  const pattern = new RegExp(
    `(<!-- begin ${table_name} link-->)(.+)(<!-- end ${table_name} link-->)`,
    "gs"
  );
  content.match(pattern);
  const link_info = RegExp.$2;
  var link_dict: { [key: string]: string } = {};
  const single_lines = link_info.trim().split("\n");
  for (let line of single_lines) {
    const regex = /\[(.+)\]/g;
    line.match(regex);
    const link_name = RegExp.$1;
    const eles = line.split(":");
    const link = `${eles[1]}:${eles[2]}`;
    link_dict[link_name] = link;
  }
  return link_dict;
}


function parseElement(element: string) {
  var address: string;
  var link_name: string;
  if (element.trim() == '') {
    address = '';
    link_name = '';
  } else {
    const regex = /\[(.+)\]\[(.+)\]/g;
    element.match(regex);
    address = RegExp.$1;
    link_name = RegExp.$2;
  }
  return new Array(address, link_name);
}

function replace(content: string, name: string, classification: string, replace: string) {
  const main_contracts = Contracts.slice(0, 2);
  const table_name = main_contracts.includes(name) ? "main" : "qualification";
  const pattern = new RegExp(
    `(<!-- begin ${table_name} ${classification}-->)(.+)(<!-- end ${table_name} ${classification}-->)`,
    "gs"
  );
  return content.replace(pattern, `$1\n${replace}\n$3`);
}

function getEnumAsArray<T extends object>(enumObject: T) {
  const keys = Object.keys(enumObject).filter((x) => Number.isNaN(Number.parseInt(x)));
  const map = new Map();
  for (let i = 0; i < keys.length; i++) {
    map.set(keys[i], enumObject[keys[i] as keyof T]);
  }
  return map;
}
