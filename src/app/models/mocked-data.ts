import { Data } from './data.interface';

export const MOCKEDDATA: Data = {
  dataId: '1234',
  nodes: [
    {
      id: '123',
      label: ['John Doe', '01/01/1970'],
      imageUrl: '',
      icon: '\uf007',
      fx: 1000,
      fy: 400,
      additionalIcon: '\uf3a5',
    },
    {
      id: '456',
      label: ['Richard Hill', '14/05/1982'],
      imageUrl: 'https://randomuser.me/api/portraits/thumb/men/99.jpg',
      icon: '',
      fx: 332,
      fy: 684,
      additionalIcon: '',
    },
    {
      id: '789',
      label: ['Rick Smith', 'Software Developer'],
      imageUrl: 'https://randomuser.me/api/portraits/thumb/men/21.jpg',
      icon: '',
      fx: 55,
      fy: 60,
      additionalIcon: '\uf2dc',
    },
    {
      id: '4',
      label: ['James Jones', 'BA'],
      imageUrl: 'https://randomuser.me/api/portraits/thumb/men/9.jpg',
      icon: '',
      fx: 414,
      fy: 369,
      additionalIcon: '',
    },
    {
      id: '423',
      label: ['Aston Villa', 'Football Club', 'Founded 1874'],
      imageUrl: 'https://houseofv.ghost.io/content/images/2024/01/GC72JKwWwAAuyGk.png',
      icon: '',
      fx: 313,
      fy: 255,
      additionalIcon: '\uf1e3',
    },
  ],
  links: [
    {
      source: '123',
      target: '456',
      lineStyle: 'Dotted',
      sourceArrow: false,
      targetArrow: true,
      linkId: '123_456',
      relationships: [
        {
          linkIndex: 0,
          label: 'Worked at IBM',
          source: '123',
          target: '456',
          linkIcon: true,
        },
        {
          linkIndex: 1,
          label: 'Both in same scrum team',
          source: '123',
          target: '456',
          linkIcon: true,
        },
      ],
    },
    {
      source: '456',
      target: '789',
      lineStyle: 'Solid',
      sourceArrow: true,
      targetArrow: true,
      linkId: '456_789',
      relationships: [
        {
          linkIndex: 2,
          label: 'Play in the same football team',
          source: '456',
          target: '789',
          linkIcon: false,
        },
        {
          linkIndex: 3,
          label: 'Daughters in the same class at school',
          source: '456',
          target: '789',
          linkIcon: true,
        },
        {
          linkIndex: 4,
          label: 'Went on a family holiday together last year',
          source: '456',
          target: '789',
          linkIcon: false,
        },
      ],
    },
    {
      source: '789',
      target: '123',
      lineStyle: 'Dotted',
      sourceArrow: true,
      targetArrow: true,
      linkId: '789_123',
      relationships: [
        {
          linkIndex: 5,
          label: 'Drink in the same pub',
          source: '789',
          target: '123',
          linkIcon: true,
        },
        {
          linkIndex: 6,
          label: 'Drinking friends',
          source: '789',
          target: '123',
          linkIcon: false,
        },
      ],
    },
    {
      source: '4',
      target: '123',
      lineStyle: 'Dotted',
      sourceArrow: true,
      targetArrow: false,
      linkId: '4_123',
      relationships: [
        {
          linkIndex: 7,
          label: ['Same University'],
          source: '4',
          target: '123',
          linkIcon: true,
        },
      ],
    },
  ],
};