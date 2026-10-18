// 犇犇正文渲染的唯一实现：Markdown + 回复链自动补回内容的标记。
// 产出 HTML 里的 feed-completion / feed-auto-merged 结构由各页面 scoped 样式负责呈现。
export function useFeedContent() {
  const { render } = useMarkdown()
  const completionTip = '此内容由洛谷档案馆根据回复链自动补全'

  function markMergedMedia(html: string, links: string[], images: string[]) {
    let marked = html
    for (const link of links) {
      const anchor = render(link).match(/<a\b[^>]*>[\s\S]*?<\/a>/i)?.[0]
      if (!anchor || !marked.includes(anchor)) continue
      marked = marked.replace(
        anchor,
        `<span class="feed-completion-wrap" tabindex="0"><span class="feed-auto-merged-link">${anchor}</span><span class="feed-completion-popover" role="tooltip">${completionTip}</span></span>`,
      )
    }
    for (const imageMd of images) {
      const image = render(imageMd).match(/<img\b[^>]*>/i)?.[0]
      if (!image || !marked.includes(image)) continue
      marked = marked.replace(
        image,
        `<span class="feed-completion-wrap feed-auto-merged-image" tabindex="0">${image}<span class="feed-completion-popover" role="tooltip">${completionTip}</span></span>`,
      )
    }
    return marked
  }

  function renderMergedSuffix(content: string, mergedSuffix: string) {
    const prefix = content.slice(0, Math.max(0, content.length - mergedSuffix.length))
    const prefixHtml = render(prefix)
    const suffixHtml = render(mergedSuffix)
    const suffixParagraph = suffixHtml.match(/^<p>([\s\S]*)<\/p>\s*$/)

    // 普通文字尾巴接回原段落；只有原 Markdown 明确换行或包含多个块时才另起一行。
    if (!mergedSuffix.startsWith('\n') && suffixParagraph && /<\/p>\s*$/.test(prefixHtml)) {
      const markedSuffix = `<span class="feed-completion-wrap" tabindex="0"><span class="feed-auto-merged">${suffixParagraph[1]}</span><span class="feed-completion-popover" role="tooltip">${completionTip}</span></span>`
      return prefixHtml.replace(/<\/p>\s*$/, `${markedSuffix}</p>`)
    }

    return prefixHtml
      + `<div class="feed-completion-wrap feed-completion-block" tabindex="0"><div class="feed-auto-merged">${suffixHtml}</div><span class="feed-completion-popover" role="tooltip">${completionTip}</span></div>`
  }

  function feedHtml(
    content: string,
    mergedSuffix?: string | null,
    mergedLinks: string[] = [],
    mergedImages: string[] = [],
  ) {
    let html = mergedSuffix
      ? renderMergedSuffix(content, mergedSuffix)
      : render(content)
    if (mergedLinks.length || mergedImages.length) {
      html = markMergedMedia(html, mergedLinks, mergedImages)
    }
    return html
  }

  return { feedHtml }
}
