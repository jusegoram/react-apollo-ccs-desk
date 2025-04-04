//import React from 'react'
import * as Icons from 'react-feather'

export default {
  items: [
    {
      title: true,
      name: 'Organization',
      wrapper: {
        // optional wrapper object
        element: 'span', // required valid HTML5 element tag
        attributes: {}, // optional valid JS object with JS API naming ex: { className: 'my-class' }
      },
      class: 'text-center', // optional class names space delimited list for title item ex: 'text-center'
    },
    {
      name: 'Techs',
      url: '/organization/techs',
      icon: Icons.Briefcase,
    },
    {
      title: true,
      name: 'Analytics',
      wrapper: {
        element: 'span',
      },
      class: 'text-center',
    },
    {
      name: 'SDCR',
      url: '/sdcr',
      icon: Icons.Activity,
    },
    {
      name: 'Work Orders',
      url: '/work-orders',
      icon: Icons.Clipboard,
    },
    {
      title: true,
      name: 'Data Import Logs',
      wrapper: {
        element: 'span',
      },
      class: 'text-center',
    },
    {
      name: 'Tech Data',
      url: '/data/techs',
      icon: Icons.Users,
    },
    {
      name: 'Work Order Data',
      url: '/data/work-orders',
      icon: Icons.Clipboard,
    },
    {
      title: true,
      name: 'TECH DASH',
      wrapper: {
        element: 'span',
      },
      class: 'text-center',
    },
    {
      name: 'Tech Dash Up Sell',
      url: '/techDashUpSell',
      icon: Icons.TrendingUp,
    },
    {
      name: 'Consumer Electronics',
      url: '/techDashConsumerElectronics',
      icon: Icons.UserCheck,
    },
    {
      name: 'EOD Executive Summary',
      url: '/techDashReport',
      icon: Icons.Clipboard,
    },
  ],
}
