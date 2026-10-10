import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import {mkdirSync,copyFileSync} from "node:fs";
export default defineConfig({base:"./",plugins:[react(),{name:"share-image",closeBundle(){mkdirSync("dist/images",{recursive:true});copyFileSync("images/greeting.png","dist/images/greeting.png")}}]});
