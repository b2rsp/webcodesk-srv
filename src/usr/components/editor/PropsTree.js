/*
 *    Copyright 2019 Alex (Oleksandr) Pustovalov
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

import isNull from 'lodash/isNull';
import cloneDeep from 'lodash/cloneDeep';
import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import List from '@material-ui/core/List';
import Typography from '@material-ui/core/Typography';
import { SortableContainer, SortableElement, SortableHandle } from 'react-sortable-hoc';
import PropsTreeItem from './PropsTreeItem';
import globalStore from '../../core/config/globalStore';
import * as constants from '../../../commons/constants';
import PropsTreeGroup from './PropsTreeGroup';
import EditJsonDialog from '../dialogs/EditJsonDialog';
import { arrayMove } from '../../core/utils/arrayUtils';

const DragHandler = SortableHandle(({element}) => element);

const SortableTreeItem = SortableElement(({element}) => element);

const SortableTreeList = SortableContainer(({items, classes}) => {
  return (
    <div className={classes.listContainer}>
      {items.map((element, index) => {
        return (
          <SortableTreeItem key={`item-${index}`} index={index} element={element} />
        );
      })}
    </div>
  )
});

const TREE_VIEW_INDENT = '21px';
const FIRST_LIST_INDENT = '0px';

const styles = theme => ({
  footerArea: {
    height: '7em',
  },
  firstListContainer: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    overflow: 'hidden',
    paddingLeft: FIRST_LIST_INDENT,
  },
  listContainer: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    overflow: 'hidden',
    paddingLeft: TREE_VIEW_INDENT,
    position: 'relative',
    '&::after': {
      content: `''`,
      position: 'absolute',
      top: 0,
      left: '9px',
      bottom: 0,
      width: 0,
      borderLeft: '1px dotted #cdcdcd',
    }
  },
  listItemContainer: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    flexDirection: 'column',
  },
  dragHandlerContainer: {
    position: 'relative',
  },
  dragHandler: {
    position: 'absolute',
    top: '9px',
    left: '-16px',
    color: '#aaaaaa',
    cursor: 'move',
    fontSize: '10px',
    zIndex: 10
  }
});

const propertyComparator = (aModel, bModel) => {
  const { type: aType, props: { propertyName: aPropertyName } } = aModel;
  const { type: bType, props: { propertyName: bPropertyName } } = bModel;
  if (!aPropertyName && bPropertyName) {
    return 1;
  } else if (aPropertyName && !bPropertyName) {
    return -1;
  } else if (!aPropertyName && !bPropertyName) {
    return 0;
  } else {
    if (aPropertyName === constants.COMPONENT_PROPERTY_DO_NOT_USE_IN_FLOWS_NAME) {
      return -1;
    }
    if (bPropertyName === constants.COMPONENT_PROPERTY_DO_NOT_USE_IN_FLOWS_NAME) {
      return 1;
    }
    if (aType === constants.COMPONENT_PROPERTY_SHAPE_TYPE || aType === constants.COMPONENT_PROPERTY_ARRAY_OF_TYPE) {
      return 1;
    }
    if (bType === constants.COMPONENT_PROPERTY_SHAPE_TYPE || bType === constants.COMPONENT_PROPERTY_ARRAY_OF_TYPE) {
      return -1;
    }
    return aPropertyName.localeCompare(bPropertyName);
  }
};

class PropsTree extends React.Component {
  static propTypes = {
    dataId: PropTypes.string,
    properties: PropTypes.array,
    onUpdateComponentPropertyModel: PropTypes.func,
    onIncreaseComponentPropertyArray: PropTypes.func,
    onDuplicateComponentPropertyArrayItem: PropTypes.func,
    onDeleteComponentProperty: PropTypes.func,
    onErrorClick: PropTypes.func,
    onUpdateComponentPropertyArrayOrder: PropTypes.func,
    onSelectComponent: PropTypes.func,
  };

  static defaultProps = {
    dataId: '',
    properties: [],
    onUpdateComponentPropertyModel: () => {
      console.info('PropsTree.onUpdateComponentPropertyModel is not set');
    },
    onIncreaseComponentPropertyArray: () => {
      console.info('PropsTree.onIncreaseComponentPropertyArray is not set');
    },
    onDuplicateComponentPropertyArrayItem: () => {
      console.info('PropsTree.onDuplicateComponentPropertyArrayItem is not set');
    },
    onDeleteComponentProperty: () => {
      console.info('PropsTree.onDeleteComponentProperty is not set');
    },
    onErrorClick: () => {
      console.info('PropsTree.onErrorClick is not set');
    },
    onUpdateComponentPropertyArrayOrder: () => {
      console.info('PropsTree.onUpdateComponentPropertyArrayOrder is not set');
    },
    onSelectComponent: () => {
      console.info('PropsTree.onSelectComponent is not set');
    },
  };

  constructor (props, context) {
    super(props, context);
    const { properties, dataId } = this.props;
    this.state = {
      expandedGroupKeys: this.getStoredExpandedKeys(dataId),
      showEditJsonDialog: false,
      editComponentPropertyModel: null,
      propertiesLocal: properties ? this.sortProperties(cloneDeep(properties)) : [],
    };
  }

  shouldComponentUpdate (nextProps, nextState, nextContext) {
    const { properties } = this.props;
    const { expandedGroupKeys, showEditJsonDialog, propertiesLocal } = this.state;
    return properties !== nextProps.properties
      || expandedGroupKeys !== nextState.expandedGroupKeys
      || showEditJsonDialog !== nextState.showEditJsonDialog
      || propertiesLocal !== nextState.propertiesLocal;
  }

  componentDidUpdate (prevProps, prevState, snapshot) {
    const { properties, dataId } = this.props;
    if (properties && properties !== prevProps.properties) {
      this.setState({
        expandedGroupKeys: this.getStoredExpandedKeys(dataId),
        propertiesLocal: this.sortProperties(cloneDeep(properties)),
      });
    }
  }

  handleUpdateComponentPropertyModel = (newComponentPropertyModel) => {
    this.props.onUpdateComponentPropertyModel(newComponentPropertyModel);
  };

  handleIncreaseComponentPropertyArray = (propertyKey) => {
    this.props.onIncreaseComponentPropertyArray(propertyKey);
  };

  handleDeleteComponentProperty = (propertyKey) => {
    this.props.onDeleteComponentProperty(propertyKey);
  };

  handleUpdateComponentPropertyArrayOrder = (model) => ({oldIndex, newIndex}) => {
    if (model && model.children) {
      model.children = arrayMove(model.children, oldIndex, newIndex);
    }
    this.props.onUpdateComponentPropertyArrayOrder(model);
  };

  handleDuplicateComponentPropertyArrayItem = (propertyKey, groupPropertyKey, itemIndex) => {
    this.props.onDuplicateComponentPropertyArrayItem(propertyKey, groupPropertyKey, itemIndex);
  };

  handleErrorClick = (messages) => {
    this.props.onErrorClick(messages);
  };

  handleSelectComponent = (componentKey) => {
    this.props.onSelectComponent(componentKey);
  };

  handleToggleExpandItem = (groupKey) => {
    const newExpandedGroupKeys = {...this.state.expandedGroupKeys};
    newExpandedGroupKeys[groupKey] = !newExpandedGroupKeys[groupKey];
    this.storeExpandedKeys(this.props.dataId, newExpandedGroupKeys);
    this.setState({
      expandedGroupKeys: newExpandedGroupKeys,
    })
  };

  handleOpenEditJsonDialog = (editComponentPropertyModel) => {
    this.setState({
      showEditJsonDialog: true,
      editComponentPropertyModel,
    });
  };

  handleCloseEditJsonDialog = () => {
    this.setState({
      showEditJsonDialog: false,
      editComponentPropertyModel: null,
    });
  };

  handleSubmitEditJsonDialog = ({script}) => {
    const { editComponentPropertyModel } = this.state;
    editComponentPropertyModel.props = editComponentPropertyModel.props || {};
    try {
      editComponentPropertyModel.props.propertyValue = JSON.parse(script);
    } catch(e) {
      // do nothing
    }
    this.props.onUpdateComponentPropertyModel(editComponentPropertyModel);
    this.handleCloseEditJsonDialog();
  };

  sortProperties = (properties) => {
    if (properties && properties.length > 0) {
      properties.forEach(propertyItem => {
        if (propertyItem && propertyItem.children && propertyItem.children.length > 0) {
          propertyItem.children = this.sortProperties(propertyItem.children);
        }
      });
      return properties.sort(propertyComparator);
    }
    return properties;
  };

  // expandAllGroupsProperties = (properties) => {
  //   let result = {};
  //   if (properties && properties.length > 0) {
  //     properties.forEach(propertyItem => {
  //       if (propertyItem) {
  //         const { type, key, children } = propertyItem;
  //         if (type === constants.COMPONENT_PROPERTY_SHAPE_TYPE || type === constants.COMPONENT_PROPERTY_ARRAY_OF_TYPE) {
  //           result[key] = true;
  //           if (children && children.length > 0) {
  //             result = {...result, ...this.expandAllGroupsProperties(children)};
  //           }
  //         }
  //       }
  //     });
  //   }
  //   return result;
  // };

  getStoredExpandedKeys = (dataId) => {
    if (dataId) {
      const recordOfExpandedKeys = globalStore.get(constants.STORAGE_RECORD_EXPANDED_COMPONENT_PROPS_KEYS) || {};
      return recordOfExpandedKeys[dataId] || {};
    }
    return {};
  };

  storeExpandedKeys = (dataId, expandedKeys) => {
    if (dataId) {
      const recordOfExpandedKeys = globalStore.get(constants.STORAGE_RECORD_EXPANDED_COMPONENT_PROPS_KEYS) || {};
      recordOfExpandedKeys[dataId] = expandedKeys;
      globalStore.set(constants.STORAGE_RECORD_EXPANDED_COMPONENT_PROPS_KEYS, recordOfExpandedKeys, true);
    }
  };

  createList = (node, parentNode = null, level = 0, arrayIndex = null) => {
    const { classes } = this.props;
    let result = [];
    let isArrayItem = false;
    let parentKey;
    if (parentNode) {
      parentKey = parentNode.key;
    }
    if (node) {
      const { key, type, props, children } = node;
      const { propertyName } = props;
      let listItemLabelName;
      if (!isNull(arrayIndex) && arrayIndex >= 0) {
        listItemLabelName = `${arrayIndex} item`;
        isArrayItem = true;
      } else {
        isArrayItem = false;
      }
      if (propertyName) {
        if (listItemLabelName) {
          listItemLabelName = propertyName;
        } else {
          listItemLabelName = propertyName;
        }
      }
      if (type === constants.COMPONENT_PROPERTY_SHAPE_TYPE) {
        result.push(
          <PropsTreeGroup
            key={key}
            name={listItemLabelName}
            parentKey={parentKey}
            arrayIndex={arrayIndex}
            propertyModel={node}
            type={type}
            isExpanded={this.state.expandedGroupKeys[key]}
            onDeleteComponentProperty={this.handleDeleteComponentProperty}
            onErrorClick={this.handleErrorClick}
            onToggleExpandItem={this.handleToggleExpandItem}
            onDuplicateComponentProperty={this.handleDuplicateComponentPropertyArrayItem}
          />
        );
        if (this.state.expandedGroupKeys[key] && children && children.length > 0) {
          result.push(
            <div key={`${key}_container`} className={classes.listItemContainer}>
              <div className={classes.listContainer}>
                {children.reduce(
                  (acc, child) => acc.concat(this.createList(child, node, level + 1, null)),
                  []
                )}
              </div>
            </div>
          );
        }
      } else if (type === constants.COMPONENT_PROPERTY_ARRAY_OF_TYPE) {
        result.push(
          <PropsTreeGroup
            key={key}
            name={listItemLabelName}
            parentKey={parentKey}
            arrayIndex={arrayIndex}
            propertyModel={node}
            type={type}
            isExpanded={this.state.expandedGroupKeys[key]}
            onIncreaseComponentPropertyArray={this.handleIncreaseComponentPropertyArray}
            onDeleteComponentProperty={this.handleDeleteComponentProperty}
            onErrorClick={this.handleErrorClick}
            onToggleExpandItem={this.handleToggleExpandItem}
            onDuplicateComponentProperty={this.handleDuplicateComponentPropertyArrayItem}
          />
        );
        if (this.state.expandedGroupKeys[key] && children && children.length > 0) {
          result.push(
            <div key={`${key}_container`} className={classes.listItemContainer}>
              <SortableTreeList
                classes={classes}
                useDragHandle={true}
                items={children.reduce(
                  (acc, child, childIdx) => acc.concat(this.createList(child, node, level + 1, childIdx)),
                  []
                )}
                onSortEnd={this.handleUpdateComponentPropertyArrayOrder(node)}
              />
            </div>
          );
        }
      } else if (type === constants.COMPONENT_PROPERTY_ELEMENT_TYPE) {
          result.push(
            <PropsTreeItem
              key={key}
              name={listItemLabelName}
              parentKey={parentKey}
              arrayIndex={arrayIndex}
              propertyModel={node}
              onDeleteComponentProperty={this.handleDeleteComponentProperty}
              onDuplicateComponentProperty={this.handleDuplicateComponentPropertyArrayItem}
              onErrorClick={this.handleErrorClick}
            />
          );
      } else if (type === constants.PAGE_COMPONENT_TYPE) {
          result.push(
            <PropsTreeItem
              key={key}
              name={listItemLabelName}
              parentKey={parentKey}
              arrayIndex={arrayIndex}
              propertyModel={node}
              onDeleteComponentProperty={this.handleDeleteComponentProperty}
              onDuplicateComponentProperty={this.handleDuplicateComponentPropertyArrayItem}
              onErrorClick={this.handleErrorClick}
              onSelectComponent={this.handleSelectComponent}
            />
          );
      } else if (type !== constants.COMPONENT_PROPERTY_FUNCTION_TYPE) {
        result.push(
          <PropsTreeItem
            key={key}
            name={listItemLabelName}
            parentKey={parentKey}
            arrayIndex={arrayIndex}
            propertyModel={node}
            onPropertyUpdate={this.handleUpdateComponentPropertyModel}
            onDeleteComponentProperty={this.handleDeleteComponentProperty}
            onErrorClick={this.handleErrorClick}
            onEditJson={this.handleOpenEditJsonDialog}
            onDuplicateComponentProperty={this.handleDuplicateComponentPropertyArrayItem}
          />
        );
      }
    }
    if (isArrayItem) {
      return [
        <div className={classes.dragHandlerContainer}>
          <DragHandler
            element={
              <div className={`${classes.dragHandler} fas fa-grip-horizontal`} />
            }
          />
          {result}
        </div>
      ];
    }
    return result;
  };

  render () {
    const { classes } = this.props;
    const { propertiesLocal } = this.state;
    if (propertiesLocal && propertiesLocal.length > 0) {
      const { showEditJsonDialog, editComponentPropertyModel } = this.state;
      let editJsonScript = '';
      let editJsonDialogTitle = '';
      if (editComponentPropertyModel && editComponentPropertyModel.props) {
        editJsonScript = JSON.stringify(editComponentPropertyModel.props.propertyValue);
        editJsonDialogTitle = `Edit property: ${editComponentPropertyModel.props.propertyName}`;
      }
      return (
        <div>
          <List
            key="componentPropsTree"
            dense={true}
            disablePadding={true}
          >
            <div className={classes.listItemContainer}>
              <div className={classes.firstListContainer}>
                {propertiesLocal.reduce(
                  (acc, child) => acc.concat(this.createList(child)),
                  []
                )}
              </div>
            </div>
          </List>
          <div className={classes.footerArea} />
          <EditJsonDialog
            title={editJsonDialogTitle}
            isOpen={showEditJsonDialog}
            script={editJsonScript}
            onClose={this.handleCloseEditJsonDialog}
            onSubmit={this.handleSubmitEditJsonDialog}
          />
        </div>
      );
    }
    return (
      <div className={classes.root}>
        <Typography variant="subtitle2" gutterBottom={true}>
          No properties found.
        </Typography>
      </div>
    );
  }
}

export default withStyles(styles)(PropsTree);