import liff from "@line/liff";
import { getUserInfo, numberWithCommas } from "./RecordFunction";

export default async function sendMessage(senderName, senderPhoto, title = '', description = '', origin, change, method, users) {

    function originArrayMixer() {
        if (method === '新增' || method === '刪除') {
            return [...originArray]
        } else if (method === '更改') {
            return [
                {
                    "type": "text",
                    "text": "原先資料",
                    "size": "md",
                    "color": "#4F4F4F",
                    "margin": "lg"
                }, ...originArray, {
                    "type": "separator",
                    "margin": "lg"
                },]
        }
    }
    const originArray = (origin || []).map(item => {
        return {
            "type": "box",
            "layout": "horizontal",
            "contents": [
                {
                    "type": "box",
                    "layout": "vertical",
                    "contents": [
                        {
                            "type": "text",
                            "text": "$" + numberWithCommas(item.debt.toString()),
                            "weight": "bold",
                            "size": "xl"
                        },
                        {
                            "type": "text",
                            "text": item.remark,
                            "size": "md",
                            "color": "#9D9D9D",
                            "gravity": "center",
                            "wrap": true
                        }
                    ],
                    "margin": "xs",
                    "spacing": "sm",
                    "justifyContent": "center",
                    "alignItems": "center",
                    "flex": 2
                },
                {
                    "type": "box",
                    "layout": "horizontal",
                    "contents": [
                        {
                            "type": "box",
                            "layout": "vertical",
                            "contents": [
                                {
                                    "type": "image",
                                    "url": getUserInfo(users, item.borrower).photo,
                                    "size": "40px",
                                    "aspectMode": "fit"
                                },
                                {
                                    "type": "text",
                                    "text": getUserInfo(users, item.borrower).name,
                                    "align": "center",
                                    "size": "xxs",
                                    "wrap": true
                                }
                            ]
                        },
                        {
                            "type": "image",
                            "url": "https://firebasestorage.googleapis.com/v0/b/count-money-579c7.firebasestorage.app/o/line-images%2F%E2%80%94Pngtree%E2%80%94right%20arrow%20glyph%20black%20icon_3755432.png?alt=media&token=114b5130-0519-4982-bda7-60a9dd9d64d1",
                            "size": "35px",
                            "aspectMode": "fit"
                        },
                        {
                            "type": "box",
                            "layout": "vertical",
                            "contents": [
                                {
                                    "type": "image",
                                    "url": getUserInfo(users, item.debtor).photo,
                                    "size": "40px",
                                    "aspectMode": "fit"
                                },
                                {
                                    "type": "text",
                                    "text": getUserInfo(users, item.debtor).name,
                                    "align": "center",
                                    "size": "xxs",
                                    "wrap": true
                                }
                            ]
                        }
                    ],
                    "alignItems": "center",
                    "flex": 2,
                    "paddingAll": "md"
                }
            ]
        }
    })

    const changeArray = (change || []).map(item => {
        return {
            "type": "box",
            "layout": "horizontal",
            "contents": [
                {
                    "type": "box",
                    "layout": "vertical",
                    "contents": [
                        {
                            "type": "text",
                            "text": "$" + numberWithCommas(item.debt.toString()),
                            "weight": "bold",
                            "size": "xl"
                        },
                        {
                            "type": "text",
                            "text": item.remark,
                            "size": "md",
                            "color": "#9D9D9D",
                            "gravity": "center",
                            "wrap": true
                        }
                    ],
                    "margin": "xs",
                    "spacing": "sm",
                    "justifyContent": "center",
                    "alignItems": "center",
                    "flex": 2
                },
                {
                    "type": "box",
                    "layout": "horizontal",
                    "contents": [
                        {
                            "type": "box",
                            "layout": "vertical",
                            "contents": [
                                {
                                    "type": "image",
                                    "url": getUserInfo(users, item.borrower).photo,
                                    "size": "40px",
                                    "aspectMode": "fit"
                                },
                                {
                                    "type": "text",
                                    "text": getUserInfo(users, item.borrower).name,
                                    "align": "center",
                                    "size": "xxs",
                                    "wrap": true
                                }
                            ]
                        },
                        {
                            "type": "image",
                            "url": "https://firebasestorage.googleapis.com/v0/b/count-money-579c7.firebasestorage.app/o/line-images%2F%E2%80%94Pngtree%E2%80%94right%20arrow%20glyph%20black%20icon_3755432.png?alt=media&token=114b5130-0519-4982-bda7-60a9dd9d64d1",
                            "size": "35px",
                            "aspectMode": "fit"
                        },
                        {
                            "type": "box",
                            "layout": "vertical",
                            "contents": [
                                {
                                    "type": "image",
                                    "url": getUserInfo(users, item.debtor).photo,
                                    "size": "40px",
                                    "aspectMode": "fit"
                                },
                                {
                                    "type": "text",
                                    "text": getUserInfo(users, item.debtor).name,
                                    "align": "center",
                                    "size": "xxs",
                                    "wrap": true
                                }
                            ]
                        }
                    ],
                    "alignItems": "center",
                    "flex": 2,
                    "paddingAll": "md"
                }
            ]
        }
    })

    const billChangeCard = {
        "type": "bubble",
        "header": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {
                    "type": "text",
                    "text": `帳單${method}`,
                    "color": "#E0E0E0",
                    "size": "md"
                }
            ]
        },
        "body": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {
                    "type": "box",
                    "layout": "horizontal",
                    "contents": [
                        {
                            "type": "box",
                            "layout": "vertical",
                            "contents": [
                                {
                                    "type": "image",
                                    "url": senderPhoto,
                                    "size": "30px",
                                    "aspectMode": "fit"
                                },
                                {
                                    "type": "text",
                                    "text": senderName,
                                    "align": "center",
                                    "size": "xxs",
                                    "wrap": true
                                }
                            ],
                            "flex": 2
                        },
                        {
                            "type": "text",
                            "text": method,
                            "wrap": true,
                            "size": "md",
                            "weight": "regular",
                            "align": "center",
                            "flex": 2,
                            "margin": "none"
                        },
                        {
                            "type": "text",
                            "wrap": false,
                            "size": "xl",
                            "color": "#6C6C6C",
                            "flex": 6,
                            "weight": "bold",
                            "offsetStart": "xs",
                            "text": `${title} 的帳目`
                        }
                    ],
                    "alignItems": "center",
                    "justifyContent": "space-between"
                },
                {
                    "type": "text",
                    "text": description,
                    "color": "#ADADAD",
                    "size": "16px",
                    "wrap": false,
                    "margin": "sm"
                },
                ...originArrayMixer(),
                {
                    "type": "text",
                    "text": method === '刪除' ? "原先資料" : "更改資料",
                    "size": "md",
                    "color": "#4F4F4F",
                    "margin": "lg"
                },
                ...changeArray
            ]
        },
        "footer": {
            "type": "box",
            "layout": "vertical",
            "spacing": "sm",
            "contents": [
                {
                    "type": "button",
                    "style": "link",
                    "height": "sm",
                    "action": {
                        "type": "uri",
                        "label": "更改",
                        "uri": "https://line.me/"
                    }
                }
            ]
        },
        "styles": {
            "header": {
                "backgroundColor": "#004B97"
            }
        }
    };
    try {
        await liff.sendMessages([
            {
                type: 'flex',
                altText: '帳目變更/新增',
                contents: billChangeCard
            }
        ])
    } catch (e) {
        console.log(e)
    }


}