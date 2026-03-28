import liff from '@line/liff'
import { getUserInfo, numberWithCommas } from './RecordFunction'
import { LINE_LIFF, APP_URL } from '../config'

export default async function sendMessage(
  senderName = '未命名',
  senderPhoto = '/gray-icon.png',
  title = '',
  description = '',
  origin,
  change,
  method,
  users,
  userInfo,
) {
  function contentMapper(array = []) {
    return array.map((item) => {
      return {
        type: 'box',
        layout: 'horizontal',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '$' + numberWithCommas(item.debt.toString()),
                weight: 'bold',
                size: 'xl',
              },
              {
                type: 'text',
                text: item.remark,
                size: 'md',
                color: '#9D9D9D',
                gravity: 'center',
                wrap: true,
              },
            ],
            margin: 'xs',
            spacing: 'sm',
            justifyContent: 'center',
            alignItems: 'center',
            flex: 2,
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                contents: [
                  {
                    type: 'image',
                    url: getUserInfo(users, item.borrower).photo,
                    size: '40px',
                    aspectMode: 'fit',
                  },
                  {
                    type: 'text',
                    text: getUserInfo(users, item.borrower).name,
                    align: 'center',
                    size: 'xxs',
                    wrap: true,
                  },
                ],
              },
              {
                type: 'image',
                url: `${APP_URL}/arrow.png`,
                size: '35px',
                aspectMode: 'fit',
              },
              {
                type: 'box',
                layout: 'vertical',
                contents: [
                  {
                    type: 'image',
                    url: getUserInfo(users, item.debtor).photo,
                    size: '40px',
                    aspectMode: 'fit',
                  },
                  {
                    type: 'text',
                    text: getUserInfo(users, item.debtor).name,
                    align: 'center',
                    size: 'xxs',
                    wrap: true,
                  },
                ],
              },
            ],
            alignItems: 'center',
            flex: 3,
            paddingAll: 'md',
          },
        ],
      }
    })
  }

  const billAddCard = {
    type: 'bubble',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: '帳單新增',
          size: 'md',
          color: '#E0E0E0',
        },
      ],
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'box',
                  layout: 'vertical',
                  contents: [
                    {
                      type: 'image',
                      url: senderPhoto,
                      size: '40px',
                      aspectMode: 'fit',
                    },
                    {
                      type: 'text',
                      text: senderName,
                      align: 'center',
                      size: 'xxs',
                      wrap: true,
                    },
                  ],
                  flex: 1,
                },
                {
                  type: 'text',
                  size: 'xs',
                  align: 'center',
                  flex: 1,
                  margin: 'none',
                  color: '#3C3C3C',
                  text: '新增',
                },
              ],
              flex: 1,
              alignItems: 'center',
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  wrap: false,
                  size: 'xl',
                  weight: 'bold',
                  text: title,
                },
                {
                  type: 'text',
                  text: description,
                  size: '16px',
                  color: '#9D9D9D',
                },
              ],
              flex: 2,
              paddingStart: 'sm',
            },
          ],
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: 'xl',
        },
        ...contentMapper(change),
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        {
          type: 'button',
          style: 'link',
          height: 'sm',
          action: {
            type: 'uri',
            label: '更改',
            uri: `https://liff.line.me/${LINE_LIFF}/?g=${userInfo.current.groupId}`,
          },
        },
      ],
    },
    styles: {
      header: {
        backgroundColor: '#004B97',
      },
    },
  }

  const billDeleteCard = {
    type: 'bubble',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: '帳單刪除',
          size: 'md',
        },
      ],
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'box',
                  layout: 'vertical',
                  contents: [
                    {
                      type: 'image',
                      url: senderPhoto,
                      size: '40px',
                      aspectMode: 'fit',
                    },
                    {
                      type: 'text',
                      text: senderName,
                      align: 'center',
                      size: 'xxs',
                      wrap: true,
                    },
                  ],
                  flex: 1,
                },
                {
                  type: 'text',
                  text: '刪除',
                  size: 'xs',
                  align: 'center',
                  flex: 1,
                  margin: 'none',
                  color: '#3C3C3C',
                },
              ],
              flex: 1,
              alignItems: 'center',
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  wrap: false,
                  size: 'xl',
                  weight: 'bold',
                  text: title,
                },
                {
                  type: 'text',
                  text: description,
                  size: '16px',
                  color: '#9D9D9D',
                },
              ],
              flex: 2,
              paddingStart: 'sm',
            },
          ],
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: 'xl',
        },
        ...contentMapper(origin),
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        {
          type: 'button',
          style: 'link',
          height: 'sm',
          action: {
            type: 'uri',
            label: '更改',
            uri: `https://liff.line.me/${LINE_LIFF}/?g=${userInfo.current.groupId}`,
          },
        },
      ],
    },
    styles: {
      header: {
        backgroundColor: '#FF8000',
      },
    },
  }

  const billChangeCard = {
    type: 'bubble',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: '帳單更改',
          size: 'md',
        },
      ],
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'box',
                  layout: 'vertical',
                  contents: [
                    {
                      type: 'image',
                      url: senderPhoto,
                      size: '40px',
                      aspectMode: 'fit',
                    },
                    {
                      type: 'text',
                      text: senderName,
                      align: 'center',
                      size: 'xxs',
                      wrap: true,
                    },
                  ],
                  flex: 1,
                },
                {
                  type: 'text',
                  text: '更改',
                  size: 'xs',
                  align: 'center',
                  flex: 1,
                  margin: 'none',
                  color: '#3C3C3C',
                },
              ],
              flex: 1,
              alignItems: 'center',
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  wrap: false,
                  size: 'xl',
                  weight: 'bold',
                  text: title,
                },
                {
                  type: 'text',
                  text: description,
                  size: '16px',
                  color: '#9D9D9D',
                },
              ],
              flex: 2,
              paddingStart: 'sm',
            },
          ],
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: 'xl',
        },
        ...contentMapper(origin),
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'image',
              url: `${APP_URL}/arrow-down.png`,
              size: 'xxs',
              aspectMode: 'fit',
            },
          ],
          margin: 'lg',
          paddingTop: 'sm',
          paddingBottom: 'sm',
          paddingStart: 'md',
          paddingEnd: 'sm',
          alignItems: 'center',
        },
        ...contentMapper(change),
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        {
          type: 'button',
          style: 'link',
          height: 'sm',
          action: {
            type: 'uri',
            label: '更改',
            uri: `https://liff.line.me/${LINE_LIFF}/?g=${userInfo.current.groupId}`,
          },
        },
      ],
    },
    styles: {
      header: {
        backgroundColor: '#FFE153',
      },
    },
  }

  function contentLoader() {
    switch (method) {
      case '新增':
        return billAddCard
      case '刪除':
        return billDeleteCard
      case '更改':
        return billChangeCard
      default:
        return undefined
    }
  }

  try {
    await liff.sendMessages([
      {
        type: 'flex',
        altText: '帳目明細',
        contents: contentLoader(),
      },
    ])
  } catch (e) {
    console.log(e)
  }
}
