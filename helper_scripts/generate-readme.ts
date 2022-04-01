import path from "path";
import fs from "fs/promises";
import { format } from "prettier";
import { ChainId, BlockExplorer, DeployedAddressRow } from './types';
import { parse } from "csv-parse/sync";

const README_PATH = path.resolve(__dirname, "..", "README.md");
const ADDRESS_TABLE_PATH = path.resolve(__dirname, "contract-addresses.csv");

async function main() {
  const content = await fs.readFile(README_PATH, "utf-8");
  const rows: DeployedAddressRow[] = await loadDeployedAddressRows();
  const mainReplaced = replace(
    content,
    "main",
    Array.from(makeMainTable(rows)).join("\n")
  );
  const qlfReplaced = replace(
    mainReplaced,
    "Qualification",
    Array.from(makeQlfTable(rows)).join("\n")
  );
  const formatted = format(qlfReplaced, {
    parser: "markdown",
    printWidth: 160,
  });
  await fs.writeFile(README_PATH, formatted, "utf-8");
}

main();

function* makeMainTable(rows: DeployedAddressRow[]) {
  yield "| Chain | MysteryBox | MaskTestNFT |";
  yield "| - | - | - |";
  for (const { Chain, MysteryBox, MaskTestNFT } of rows) {
    const mbElement = formElement(MysteryBox, `mb-${Chain}`);
    const nftElement = formElement(MaskTestNFT, `nft-${Chain}`);
    yield `| ${Chain} | ${mbElement} | ${nftElement} |`;
  }
  yield "";
  for (const { Chain, MysteryBox} of rows) {
    const link = formLink(MysteryBox, Chain, "mb");
    if (link == null) continue;
    yield link;
  }
  for (const { Chain, MaskTestNFT } of rows) {
    const link = formLink(MaskTestNFT, Chain, "nft");
    if (link == null) continue;
    yield link;
  }
}

function* makeQlfTable(rows: DeployedAddressRow[]) {
  yield "| Chain | WhitelistQlf | SigVerifyQlf | MaskHolderQlf | MerkleProofQlf |";
  yield "| - | - | - | - | - |";
  for (const { Chain, WhitelistQlf, SigVerifyQlf, MaskHolderQlf, MerkleProofQlf } of rows) {
    const wlElement = formElement(WhitelistQlf, `wl-${Chain}`);
    const svElement = formElement(SigVerifyQlf, `sv-${Chain}`);
    const mhElement = formElement(MaskHolderQlf, `mh-${Chain}`);
    const mpElement = formElement(MerkleProofQlf, `mp-${Chain}`);
    yield `| ${Chain} | ${wlElement} | ${svElement} | ${mhElement} | ${mpElement} |`;
  }
  yield "";
  for (const { Chain, WhitelistQlf, SigVerifyQlf, MaskHolderQlf, MerkleProofQlf } of rows) {
    const wlLink = formLink(WhitelistQlf, Chain, "wl");
    if (wlLink != null) yield wlLink;
    const svLink = formLink(SigVerifyQlf, Chain, "sv");
    if (svLink != null) yield svLink;
    const mhLink = formLink(MaskHolderQlf, Chain, "mh");
    if (mhLink != null) yield mhLink;
    const mpLink = formLink(MerkleProofQlf, Chain, "mp");
    if (mpLink != null) yield mpLink;
  }
}

async function loadDeployedAddressRows(): Promise<DeployedAddressRow[]> {
  const data = await fs.readFile(ADDRESS_TABLE_PATH, "utf-8")
  const headers = ['Chain', 'MysteryBox', 'MaskTestNFT', 'WhitelistQlf', 'SigVerifyQlf', 'MaskHolderQlf', 'MerkleProofQlf']
  return parse(data, { delimiter: ',', columns: headers, from: 2 });
}

function formElement(address: string, linkTag: string) {
  if (address == '') {
    return ''
  }
  return `[\`${address.substr(0, 10)}\`][${linkTag}]`;
}

function formLink(address: string, chain: string, contract: string) {
  if (address == '') {
    return null;
  }
  const requiredChainId: ChainId = getEnumAsArray(ChainId).get(chain);
  const browserPath = BlockExplorer[requiredChainId](address);
  return `[${contract}-${chain}]: ${browserPath}`;
}

function replace(content: string, name: string, replace: string) {
  const pattern = new RegExp(
    `(<!-- begin ${name} -->)(.+)(<!-- end ${name} -->)`,
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
