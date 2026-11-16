import shared from "./shared.ts";
import products from "./products.ts";
import tools from "./tools.ts";
import developerCommands from "./developerCommands.ts";
import catalogs from "./catalogs.ts";
import native from "./native.ts";

import prephub from "./prephub.ts";

import tasks from "./tasks.ts";

export default { ...tasks, ...prephub, ...shared, ...products, ...tools, ...developerCommands, ...catalogs, ...native } as const;
