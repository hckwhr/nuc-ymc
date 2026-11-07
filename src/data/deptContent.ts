/*
 * 无图部门子站内容（采编/运营/微信/综发）——用编辑化排版突出各自工作。
 * ★占位★ 文字可按实际情况替换。
 */
export interface Feature {
  icon: string;
  title: string;
  desc: string;
}
export interface DeptShowcase {
  key: string;
  name: string;
  nameEn: string;
  accent: string;
  tagline: string;
  intro: string;
  features: Feature[];
  process: string[];
  outputs: string[];
  quote: string;
}

export const deptShowcases: Record<string, DeptShowcase> = {
  editorial: {
    key: "editorial",
    name: "采编部",
    nameEn: "Editorial",
    accent: "#FBBF24",
    tagline: "只写能触动自己的文字",
    intro:
      "我们只写能触动自己的文字。思绪散在很远很远的地方，是宇宙的最边沿；目光落在很近很近的位置，是人来人往的中央大道，也是偶有猫猫、学长睡着觉的小草坪。我们为公众号「中北大学共青团」供稿，一篇篇过千上万阅读的推文，凝聚着太多天马行空的思绪与一闪而过的灵光。只要青媒需要，任何时间、任何地点，青媒采编，认真码字。欢迎加入！🙌",
    features: [
      { icon: "doc", title: "选题策划", desc: "敏锐捕捉校园热点与中心动态，策划有价值、有温度的选题。" },
      { icon: "mic", title: "现场采访", desc: "深入活动现场与人物身边，用提问挖掘真实的声音与故事。" },
      { icon: "pen", title: "撰稿写作", desc: "通讯、专访、评论、推文文案，用扎实的文字把内容立起来。" },
      { icon: "check", title: "内容编辑", desc: "校对、润色、统稿，把关每一篇稿件的准确与质感。" },
    ],
    process: ["定选题", "采访调研", "撰写初稿", "编辑校对", "成稿发布"],
    outputs: ["活动通讯", "人物专访", "深度报道", "推文文案", "评论随笔"],
    quote: "好的记录，是让被看见的人，被记住。",
  },
  operation: {
    key: "operation",
    name: "运营部",
    nameEn: "Operations",
    accent: "#10B981",
    tagline: "有你，才叫「新」媒体",
    intro:
      "我们运营微博与 QQ「中北大学青年媒体中心」，时刻与中北的师生朋友们保持联系，把来自青媒的温度送达全中北。我们对热点保持敏锐，察觉大家的关注与兴趣；也总出现在青媒需要的地方——活动布置、应援、采访，样样都来。我们很快乐，因为心有所向。欢迎加入，有你，才叫『新』媒体！",
    features: [
      { icon: "sparkle", title: "活动策划", desc: "从主题、流程到亮点设计，产出可执行的活动策划方案。" },
      { icon: "calendar", title: "执行统筹", desc: "协调人、财、物与时间线，把方案变成落地的现场。" },
      { icon: "users", title: "用户运营", desc: "维护社群、组织报名与互动，让参与者持续活跃。" },
      { icon: "chart", title: "数据复盘", desc: "收集反馈与数据，复盘每场活动的效果与改进点。" },
    ],
    process: ["需求对齐", "策划方案", "分工筹备", "现场执行", "数据复盘"],
    outputs: ["活动策划案", "执行手册", "报名统计", "社群运营", "复盘报告"],
    quote: "台前的精彩，来自幕后的秩序。",
  },
  wechat: {
    key: "wechat",
    name: "微信部",
    nameEn: "WeChat",
    accent: "#14B8A6",
    tagline: "排版，也是一种创作",
    intro:
      "借助 135、秀米等工具，我们负责公众号「中北大学共青团」的排版。排版也是一种创作——你的灵光一点，或许就为一篇推文添上了灵魂。你是否也惊叹过那些走心排版的推文？加入微信部，踏实练基本功，大胆进修高级排版。我们热衷于进步——我知道，你也一样。欢迎加入！🤩",
    features: [
      { icon: "layout", title: "图文排版", desc: "把文字与图片编排成赏心悦目、阅读顺畅的推文。" },
      { icon: "megaphone", title: "内容推送", desc: "规划推送节奏与栏目，把中心的声音准时送达。" },
      { icon: "chat", title: "粉丝运营", desc: "维护菜单栏与后台互动，经营与读者的长期连接。" },
      { icon: "link", title: "新媒体矩阵", desc: "联动多平台，构建中心的新媒体传播矩阵。" },
    ],
    process: ["选题排期", "内容编辑", "图文排版", "审核推送", "数据追踪"],
    outputs: ["公众号推文", "图文排版", "菜单栏运营", "粉丝互动", "阅读数据"],
    quote: "每一次推送，都是一次认真的见面。",
  },
  general: {
    key: "general",
    name: "综发部",
    nameEn: "General Affairs",
    accent: "#8B5CF6",
    tagline: "在这里，做你真正热爱的事",
    intro:
      "作为青媒存在与成长的保障，你可以是在汉语言文化大赛舞台上落落大方的主持人，也可以是精通统筹、按课表把值班与人员安排得有条不紊的幕后『大脑』；你还可以按自己的兴趣，和别的部门交流学习、彼此进步。我的意思是——在这里，你可以做你真正热爱的事，我们包容你所有的可能。欢迎加入！💞",
    features: [
      { icon: "link", title: "综合协调", desc: "打通各部门协作，统筹排期与资源，让中心运转有序。" },
      { icon: "users", title: "对外联络", desc: "对接校内外资源与合作方，拓展中心的外部连接。" },
      { icon: "layout", title: "资源统筹", desc: "管理物资、场地与经费，为活动与产出提供保障。" },
      { icon: "check", title: "日常运营", desc: "例会、档案、制度与后勤，撑起中心的日常运转。" },
    ],
    process: ["需求汇总", "资源对接", "统筹协调", "落地保障", "归档复盘"],
    outputs: ["跨部门协调", "资源对接", "对外合作", "后勤保障", "制度档案"],
    quote: "看不见的统筹，成就看得见的中心。",
  },
};
