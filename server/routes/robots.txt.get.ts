import { setHeader } from "h3";
import { robotsText } from "../../app/lib/product-seo";
import { requestDomain } from "../utils/product-domain";

export default defineEventHandler((event) => {
  const { config, context } = requestDomain(event);
  setHeader(event, "Content-Type", "text/plain; charset=utf-8");
  setHeader(event, "Cache-Control", "no-store");
  return robotsText(config, context);
});
