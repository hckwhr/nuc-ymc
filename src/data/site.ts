/*
 * 全站文字内容（改文案只改这里）。
 */
export interface Dept {
  key: string;
  name: string;
  nameEn: string;
  accent: string;
  desc: string;      // 首页卡片短介绍
  story?: string;    // 子站完整招新文案（摄影/设计/抖音用）
  link?: string;
}

export const site = {
  center: {
    name: "青年媒体中心",
    nameEn: "NUC Youth Media Center",
    slogan: "记录青春 · 传递声音",
    heroLead: "记录青春，",
    heroEmph: "传递每一种声音。",
    // Hero 下方短描述
    intro:
      "中北人记录青春、传递声音的地方。用镜头、设计、视频与文字，让值得被看见的青春，被更多人听见。",
    // 关于我们段落（我根据七个部门写的中心总介绍）
    about:
      "青年媒体中心，是中北人记录青春、传递声音的地方。我们用镜头定格四季，用设计点亮灵感，用短视频与推文讲述校园的温度，用文字打磨值得被记住的故事，也用运营与统筹让每一次相遇稳稳发生。摄影、设计、抖音、采编、运营、微信、综合发展——七个部门各司其职，又彼此成就。只因我们始终相信：值得被看见的青春，理应被更多人听见。",
  },

  departments: [
    {
      key: "photography", name: "摄影部", nameEn: "Photography", accent: "#38BDF8",
      desc: "用镜头定格四季，记录属于每个中北人的青春与美好。",
      story:
        "脚下乾坤大，镜头囊天地。我们追寻一切美好，用光影定格时间、留存记忆——拍萌萌的猫猫狗狗，拍学长学姐，拍清秋独坐长椅时一片枯叶的寂寥与清寒，拍黄昏里一寸寸盛烈又一寸寸暗淡的极美晚霞。我们拍自己的青春，也拍别人的，记录属于每一个中北人的一年四季。欢迎加入，我们定不负你的赤忱与热爱。💓",
      link: "/photography",
    },
    {
      key: "design", name: "设计部", nameEn: "Design", accent: "#FF7A59",
      desc: "把灵感具现——招新、大赛海报与公众号配图皆出自我们之手。",
      story:
        "那张古朴厚重、满是中华文化气息的汉语言文化大赛门票？那些吸睛又突出重点、还兼具美感的招新与大赛宣传海报？公众号里画龙点睛、悄悄把阅读量拉高的配图？是的，以上皆出自我们之手——我们对自己的作品负责，也请尽管夸。欢迎加入，让我们把灵感具现，惊艳每一个懂作品的人。🥰",
      link: "/design",
    },
    {
      key: "douyin", name: "抖音部", nameEn: "Douyin", accent: "#FB6F92",
      desc: "运营「中北大学」官方抖音，摄像·剪辑·配乐一体的极酷部门。",
      story:
        "我们专门运营「中北大学」官方抖音账号，集摄像（无人机航拍、摄影机实拍）、剪辑（PR、PS、达芬奇）、配乐（选曲、卡点）于一体——一个极酷的部门。期待你的加入！🥰",
      link: "/douyin",
    },
    {
      key: "editing", name: "采编部", nameEn: "Editorial", accent: "#FBBF24",
      desc: "只写能触动自己的文字，为「中北大学共青团」供稿。",
      link: "/editorial",
    },
    {
      key: "operation", name: "运营部", nameEn: "Operations", accent: "#10B981",
      desc: "运营微博与 QQ「中北大学青年媒体中心」，把青媒的温度送达全中北。",
      link: "/operation",
    },
    {
      key: "wechat", name: "微信部", nameEn: "WeChat", accent: "#14B8A6",
      desc: "负责「中北大学共青团」公众号排版，让每篇推文更有灵魂。",
      link: "/wechat",
    },
    {
      key: "general", name: "综发部", nameEn: "General Affairs", accent: "#8B5CF6",
      desc: "青媒运转的保障——统筹、主持与协调，包容你所有可能。",
      link: "/general",
    },
  ] as Dept[],

  stats: [
    { label: "中心成员", value: 120, suffix: "+" },   // ★占位★
    { label: "作品产出", value: 800, suffix: "+" },   // ★占位★
    { label: "活动场次", value: 60, suffix: "+" },    // ★占位★
    { label: "全网阅读", value: 100, suffix: "k+" },  // ★占位★
  ],

  recruit: {
    time: "每年 9~10 月招新季",
    intro: "如果你热爱记录、表达与创造，欢迎加入我们，一起让青春被看见。",
    contact: "", // 招新负责人微信（留空则不显示；以后想加填这里）
  },

  contact: {
    wechat: "中北大学共青团",
    douyin: "Nuc1941",
    email: "3113074598@qq.com",
    qrcodes: [
      { label: "官方 QQ 群", src: "/assets/qr/qr-qqgroup.png?v=2026" },
      { label: "抖音 · Nuc1941", src: "/assets/qr/qr-douyin.jpg" },
    ],
  },
};
