import shared from "./shared.ts";
import products from "./products.ts";
import tools from "./tools.ts";
import developerCommands from "./developerCommands.ts";
import catalogs from "./catalogs.ts";
import native from "./native.ts";

export default { ...shared, ...products, ...tools, ...developerCommands, ...catalogs, ...native } as const;
