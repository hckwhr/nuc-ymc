/**
 * 生成阿里云 OSS 图片处理缩略图 URL。
 * 仅在 OSS(线上自定义域名)生效；本地 dev / 非 OSS 环境会忽略该 query，退化为原图。
 * 视频不处理。
 */
export function ossThumb(src: string, w: number, q = 82): string {
  if (!src || /\.(mp4|webm|mov|m4v)$/i.test(src)) return src;
  const sep = src.includes("?") ? "&" : "?";
  return `${src}${sep}x-oss-process=image/resize,w_${w}/quality,q_${q}`;
}
