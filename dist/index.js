// lib/cju.ts
import * as Soup from "circuit-json";

// lib/subtree.ts
function connect(map, a, b) {
  if (!a || !b) return;
  let setA = map.get(a);
  if (!setA) {
    setA = /* @__PURE__ */ new Set();
    map.set(a, setA);
  }
  setA.add(b);
  let setB = map.get(b);
  if (!setB) {
    setB = /* @__PURE__ */ new Set();
    map.set(b, setB);
  }
  setB.add(a);
}
function buildSubtree(soup, opts) {
  if (!opts.subcircuit_id && !opts.source_group_id) return [...soup];
  let effectiveOpts = opts;
  if (opts.subcircuit_id) {
    const subcircuitIds = /* @__PURE__ */ new Set([opts.subcircuit_id]);
    const groupChildren = /* @__PURE__ */ new Map();
    const groupSubcircuit = /* @__PURE__ */ new Map();
    for (const elm of soup) {
      if (elm.type === "source_group") {
        const groupId = elm.source_group_id;
        const subcircuitId = elm.subcircuit_id;
        if (subcircuitId) {
          groupSubcircuit.set(groupId, subcircuitId);
        }
        const parentId = elm.parent_source_group_id;
        if (parentId) {
          if (!groupChildren.has(parentId)) {
            groupChildren.set(parentId, []);
          }
          groupChildren.get(parentId).push(groupId);
        }
      }
    }
    let rootGroupId;
    for (const [groupId, subcircuitId] of groupSubcircuit) {
      if (subcircuitId === opts.subcircuit_id) {
        rootGroupId = groupId;
        break;
      }
    }
    if (rootGroupId) {
      const collectChildSubcircuits = (groupId) => {
        const children = groupChildren.get(groupId) || [];
        for (const childId of children) {
          const childSubcircuit = groupSubcircuit.get(childId);
          if (childSubcircuit) {
            subcircuitIds.add(childSubcircuit);
          }
          collectChildSubcircuits(childId);
        }
      };
      collectChildSubcircuits(rootGroupId);
      effectiveOpts = { ...opts, subcircuit_ids: Array.from(subcircuitIds) };
    }
  }
  const idMap = /* @__PURE__ */ new Map();
  for (const elm of soup) {
    const idKey = `${elm.type}_id`;
    const idVal = elm[idKey];
    if (typeof idVal === "string") {
      idMap.set(idVal, elm);
    }
  }
  const adj = /* @__PURE__ */ new Map();
  for (const elm of soup) {
    const entries = Object.entries(elm);
    for (const [key, val] of entries) {
      if (key === "parent_source_group_id") continue;
      if (key.endsWith("_id") && typeof val === "string") {
        const other = idMap.get(val);
        connect(adj, elm, other);
      } else if (key.endsWith("_ids") && Array.isArray(val)) {
        for (const v of val) {
          if (typeof v === "string") {
            const other = idMap.get(v);
            connect(adj, elm, other);
          }
        }
      }
    }
  }
  const queue = [];
  const included = /* @__PURE__ */ new Set();
  for (const elm of soup) {
    let shouldInclude = false;
    if (effectiveOpts.subcircuit_id && "subcircuit_id" in elm && elm.subcircuit_id === effectiveOpts.subcircuit_id) {
      shouldInclude = true;
    } else if (effectiveOpts.subcircuit_ids && "subcircuit_id" in elm && elm.subcircuit_id && effectiveOpts.subcircuit_ids.includes(elm.subcircuit_id)) {
      shouldInclude = true;
    } else if (effectiveOpts.source_group_id && "source_group_id" in elm && elm.source_group_id === effectiveOpts.source_group_id) {
      shouldInclude = true;
    } else if (effectiveOpts.source_group_id && "member_source_group_ids" in elm && Array.isArray(elm.member_source_group_ids) && elm.member_source_group_ids.includes(effectiveOpts.source_group_id)) {
      shouldInclude = true;
    }
    if (shouldInclude) {
      queue.push(elm);
      included.add(elm);
    }
  }
  while (queue.length > 0) {
    const elm = queue.shift();
    const neighbors = adj.get(elm);
    if (!neighbors) continue;
    for (const n of neighbors) {
      if (!included.has(n)) {
        included.add(n);
        queue.push(n);
      }
    }
  }
  return soup.filter((e) => included.has(e));
}

// lib/cju.ts
var cju = ((circuitJsonInput, options = {}) => {
  const circuitJson = circuitJsonInput;
  let internalStore = circuitJson._internal_store;
  if (!internalStore) {
    internalStore = {
      counts: {},
      editCount: 0
    };
    circuitJson._internal_store = internalStore;
    for (const elm of circuitJson) {
      const type = elm.type;
      const idVal = elm[`${type}_id`];
      if (!idVal) continue;
      const idNum = Number.parseInt(idVal.split("_").pop());
      if (!Number.isNaN(idNum)) {
        internalStore.counts[type] = Math.max(
          internalStore.counts[type] ?? 0,
          idNum
        );
      }
    }
  }
  const su2 = new Proxy(
    {},
    {
      get: (proxy_target, prop) => {
        if (prop === "toArray") {
          return () => {
            ;
            circuitJson.editCount = internalStore.editCount;
            return circuitJson;
          };
        }
        if (prop === "editCount") {
          return internalStore.editCount;
        }
        if (prop === "subtree") {
          return (opts) => cju(buildSubtree(circuitJson, opts), options);
        }
        if (prop === "insert") {
          return (elm) => {
            const component_type2 = elm.type;
            if (!component_type2) {
              throw new Error("insert requires an element with a type");
            }
            internalStore.counts[component_type2] ??= -1;
            internalStore.counts[component_type2]++;
            const index = internalStore.counts[component_type2];
            const newElm = {
              ...elm,
              type: component_type2,
              [`${component_type2}_id`]: `${component_type2}_${index}`
            };
            if (options.validateInserts) {
              const parser = Soup[component_type2] ?? Soup.any_soup_element;
              parser.parse(newElm);
            }
            circuitJson.push(newElm);
            internalStore.editCount++;
            return newElm;
          };
        }
        if (prop === "insertAll") {
          return (elms) => {
            return elms.map((elm) => su2.insert(elm));
          };
        }
        const component_type = prop;
        return {
          get: (id) => circuitJson.find(
            (e) => e.type === component_type && e[`${component_type}_id`] === id
          ),
          getUsing: (using) => {
            const keys = Object.keys(using);
            if (keys.length !== 1) {
              throw new Error(
                "getUsing requires exactly one key, e.g. { pcb_component_id }"
              );
            }
            const join_key = keys[0];
            const join_type = join_key.replace("_id", "");
            const joiner = circuitJson.find(
              (e) => e.type === join_type && e[join_key] === using[join_key]
            );
            if (!joiner) return null;
            return circuitJson.find(
              (e) => e.type === component_type && e[`${component_type}_id`] === joiner[`${component_type}_id`]
            );
          },
          getWhere: (where) => {
            const keys = Object.keys(where);
            return circuitJson.find(
              (e) => e.type === component_type && keys.every((key) => e[key] === where[key])
            );
          },
          list: (where) => {
            const keys = !where ? [] : Object.keys(where);
            return circuitJson.filter(
              (e) => e.type === component_type && keys.every((key) => e[key] === where[key])
            );
          },
          insert: (elm) => {
            internalStore.counts[component_type] ??= -1;
            internalStore.counts[component_type]++;
            const index = internalStore.counts[component_type];
            const newElm = {
              type: component_type,
              [`${component_type}_id`]: `${component_type}_${index}`,
              ...elm
            };
            if (options.validateInserts) {
              const parser = Soup[component_type] ?? Soup.any_soup_element;
              parser.parse(newElm);
            }
            circuitJson.push(newElm);
            internalStore.editCount++;
            return newElm;
          },
          delete: (id) => {
            const elm = circuitJson.find(
              (e) => e[`${component_type}_id`] === id
            );
            if (!elm) return;
            circuitJson.splice(circuitJson.indexOf(elm), 1);
            internalStore.editCount++;
          },
          update: (id, newProps) => {
            const elm = circuitJson.find(
              (e) => e.type === component_type && e[`${component_type}_id`] === id
            );
            if (!elm) return null;
            Object.assign(elm, newProps);
            internalStore.editCount++;
            return elm;
          },
          select: (selector) => {
            if (component_type === "source_component") {
              return circuitJson.find(
                (e) => e.type === "source_component" && e.name === selector.replace(/\./g, "")
              );
            } else if (component_type === "pcb_port" || component_type === "source_port" || component_type === "schematic_port") {
              const [component_name, port_selector] = selector.replace(/\./g, "").split(/[\s\>]+/);
              const source_component = circuitJson.find(
                (e) => e.type === "source_component" && e.name === component_name
              );
              if (!source_component) return null;
              const source_port = circuitJson.find(
                (e) => e.type === "source_port" && e.source_component_id === source_component.source_component_id && (e.name === port_selector || (e.port_hints ?? []).includes(port_selector))
              );
              if (!source_port) return null;
              if (component_type === "source_port") return source_port;
              if (component_type === "pcb_port") {
                return circuitJson.find(
                  (e) => e.type === "pcb_port" && e.source_port_id === source_port.source_port_id
                );
              } else if (component_type === "schematic_port") {
                return circuitJson.find(
                  (e) => e.type === "schematic_port" && e.source_port_id === source_port.source_port_id
                );
              }
            }
          }
        };
      }
    }
  );
  return su2;
});
cju.unparsed = cju;
var su = cju;
var cju_default = cju;

// lib/cju-indexed.ts
import * as Soup2 from "circuit-json";
function createIdKey(element) {
  const type = element.type;
  return `${type}:${element[`${type}_id`]}`;
}
var cjuIndexed = ((soup, options = {}) => {
  let internalStore = soup._internal_store_indexed;
  if (!internalStore) {
    internalStore = {
      counts: {},
      editCount: 0,
      indexes: {}
    };
    for (const elm of soup) {
      const type = elm.type;
      const idVal = elm[`${type}_id`];
      if (!idVal) continue;
      const idNum = Number.parseInt(idVal.split("_").pop() || "");
      if (!Number.isNaN(idNum)) {
        internalStore.counts[type] = Math.max(
          internalStore.counts[type] ?? 0,
          idNum
        );
      }
    }
    const indexConfig = options.indexConfig || {};
    const indexes = internalStore.indexes;
    if (indexConfig.byId) {
      indexes.byId = /* @__PURE__ */ new Map();
    }
    if (indexConfig.byType) {
      indexes.byType = /* @__PURE__ */ new Map();
    }
    if (indexConfig.byRelation) {
      indexes.byRelation = /* @__PURE__ */ new Map();
    }
    if (indexConfig.bySubcircuit) {
      indexes.bySubcircuit = /* @__PURE__ */ new Map();
    }
    if (indexConfig.byCustomField && indexConfig.byCustomField.length > 0) {
      indexes.byCustomField = /* @__PURE__ */ new Map();
      for (const field of indexConfig.byCustomField) {
        indexes.byCustomField.set(field, /* @__PURE__ */ new Map());
      }
    }
    for (const element of soup) {
      if (indexConfig.byId) {
        const idKey = createIdKey(element);
        indexes.byId.set(idKey, element);
      }
      if (indexConfig.byType) {
        const elementsOfType = indexes.byType.get(element.type) || [];
        elementsOfType.push(element);
        indexes.byType.set(element.type, elementsOfType);
      }
      if (indexConfig.byRelation) {
        const elementEntries = Object.entries(element);
        for (const [key, value] of elementEntries) {
          if (key.endsWith("_id") && key !== `${element.type}_id` && typeof value === "string") {
            const relationTypeMap = indexes.byRelation.get(key) || /* @__PURE__ */ new Map();
            const relatedElements = relationTypeMap.get(value) || [];
            relatedElements.push(element);
            relationTypeMap.set(value, relatedElements);
            indexes.byRelation.set(key, relationTypeMap);
          }
        }
      }
      if (indexConfig.bySubcircuit && "subcircuit_id" in element) {
        const subcircuitId = element.subcircuit_id;
        if (subcircuitId && typeof subcircuitId === "string") {
          const subcircuitElements = indexes.bySubcircuit.get(subcircuitId) || [];
          subcircuitElements.push(element);
          indexes.bySubcircuit.set(subcircuitId, subcircuitElements);
        }
      }
      if (indexConfig.byCustomField && indexes.byCustomField) {
        for (const field of indexConfig.byCustomField) {
          if (field in element) {
            const fieldValue = element[field];
            if (fieldValue !== void 0 && (typeof fieldValue === "string" || typeof fieldValue === "number")) {
              const fieldValueStr = String(fieldValue);
              const fieldMap = indexes.byCustomField.get(field);
              const elementsWithFieldValue = fieldMap.get(fieldValueStr) || [];
              elementsWithFieldValue.push(element);
              fieldMap.set(fieldValueStr, elementsWithFieldValue);
            }
          }
        }
      }
    }
    ;
    soup._internal_store_indexed = internalStore;
  }
  const suIndexed = new Proxy(
    {},
    {
      get: (proxy_target, prop) => {
        if (prop === "toArray") {
          return () => {
            ;
            soup.editCount = internalStore.editCount;
            return soup;
          };
        }
        if (prop === "editCount") {
          return internalStore.editCount;
        }
        if (prop === "insert") {
          return (elm) => {
            const { type, ...props } = elm;
            if (!type) throw new Error("insert requires an element with a type");
            delete props[`${type}_id`];
            return suIndexed[type].insert(props);
          };
        }
        if (prop === "insertAll") {
          return (elms) => elms.map((elm) => suIndexed.insert(elm));
        }
        if (prop === "subtree") {
          return (opts) => cjuIndexed(buildSubtree(soup, opts), options);
        }
        const component_type = prop;
        return {
          get: (id) => {
            const indexConfig = options.indexConfig || {};
            if (indexConfig.byId && internalStore.indexes.byId) {
              return internalStore.indexes.byId.get(
                `${component_type}:${id}`
              ) || null;
            }
            if (indexConfig.byType && internalStore.indexes.byType) {
              const elementsOfType = internalStore.indexes.byType.get(component_type) || [];
              return elementsOfType.find(
                (e) => e[`${component_type}_id`] === id
              ) || null;
            }
            return soup.find(
              (e) => e.type === component_type && e[`${component_type}_id`] === id
            ) || null;
          },
          getUsing: (using) => {
            const indexConfig = options.indexConfig || {};
            const keys = Object.keys(using);
            if (keys.length !== 1) {
              throw new Error(
                "getUsing requires exactly one key, e.g. { pcb_component_id }"
              );
            }
            const join_key = keys[0];
            const join_type = join_key.replace("_id", "");
            if (indexConfig.byRelation && internalStore.indexes.byRelation) {
              const relationMap = internalStore.indexes.byRelation.get(join_key);
              if (relationMap) {
                const relatedElements = relationMap.get(using[join_key]) || [];
                const joiner2 = relatedElements.find((e) => e.type === join_type);
                if (!joiner2) return null;
                const joinerId = joiner2[`${component_type}_id`];
                if (indexConfig.byId && internalStore.indexes.byId) {
                  return internalStore.indexes.byId.get(
                    `${component_type}:${joinerId}`
                  ) || null;
                }
                if (indexConfig.byType && internalStore.indexes.byType) {
                  const elementsOfType = internalStore.indexes.byType.get(component_type) || [];
                  return elementsOfType.find(
                    (e) => e[`${component_type}_id`] === joinerId
                  ) || null;
                }
                return soup.find(
                  (e) => e.type === component_type && e[`${component_type}_id`] === joinerId
                ) || null;
              }
            }
            const joiner = soup.find(
              (e) => e.type === join_type && e[join_key] === using[join_key]
            );
            if (!joiner) return null;
            return soup.find(
              (e) => e.type === component_type && e[`${component_type}_id`] === joiner[`${component_type}_id`]
            ) || null;
          },
          getWhere: (where) => {
            const indexConfig = options.indexConfig || {};
            const keys = Object.keys(where);
            if (keys.length === 1 && indexConfig.byCustomField && internalStore.indexes.byCustomField) {
              const field = keys[0];
              const fieldMap = internalStore.indexes.byCustomField.get(field);
              if (fieldMap) {
                const fieldValue = String(where[field]);
                const elementsWithFieldValue = fieldMap.get(fieldValue) || [];
                return elementsWithFieldValue.find(
                  (e) => e.type === component_type
                ) || null;
              }
            }
            if ("subcircuit_id" in where && indexConfig.bySubcircuit && internalStore.indexes.bySubcircuit) {
              const subcircuitId = where.subcircuit_id;
              const subcircuitElements = internalStore.indexes.bySubcircuit.get(subcircuitId) || [];
              return subcircuitElements.find(
                (e) => e.type === component_type && keys.every((key) => e[key] === where[key])
              ) || null;
            }
            if (indexConfig.byType && internalStore.indexes.byType) {
              const elementsOfType = internalStore.indexes.byType.get(component_type) || [];
              return elementsOfType.find(
                (e) => keys.every((key) => e[key] === where[key])
              ) || null;
            }
            return soup.find(
              (e) => e.type === component_type && keys.every((key) => e[key] === where[key])
            ) || null;
          },
          list: (where) => {
            const indexConfig = options.indexConfig || {};
            const keys = !where ? [] : Object.keys(where);
            if (keys.length === 0 && indexConfig.byType && internalStore.indexes.byType) {
              return (internalStore.indexes.byType.get(component_type) || []).slice();
            }
            if (keys.length === 1 && keys[0] === "subcircuit_id" && indexConfig.bySubcircuit && internalStore.indexes.bySubcircuit) {
              const subcircuitId = where.subcircuit_id;
              const subcircuitElements = internalStore.indexes.bySubcircuit.get(subcircuitId) || [];
              return subcircuitElements.filter(
                (e) => e.type === component_type
              );
            }
            let elementsToFilter;
            if (indexConfig.byType && internalStore.indexes.byType) {
              elementsToFilter = internalStore.indexes.byType.get(component_type) || [];
            } else {
              elementsToFilter = soup.filter((e) => e.type === component_type);
            }
            if (keys.length > 0) {
              return elementsToFilter.filter(
                (e) => keys.every((key) => e[key] === where[key])
              );
            }
            return elementsToFilter.slice();
          },
          insert: (elm) => {
            internalStore.counts[component_type] ??= -1;
            internalStore.counts[component_type]++;
            const index = internalStore.counts[component_type];
            const newElm = {
              type: component_type,
              [`${component_type}_id`]: `${component_type}_${index}`,
              ...elm
            };
            if (options.validateInserts) {
              const parser = Soup2[component_type] ?? Soup2.any_soup_element;
              parser.parse(newElm);
            }
            soup.push(newElm);
            internalStore.editCount++;
            const indexConfig = options.indexConfig || {};
            if (indexConfig.byId && internalStore.indexes.byId) {
              const idKey = createIdKey(newElm);
              internalStore.indexes.byId.set(idKey, newElm);
            }
            if (indexConfig.byType && internalStore.indexes.byType) {
              const elementsOfType = internalStore.indexes.byType.get(component_type) || [];
              elementsOfType.push(newElm);
              internalStore.indexes.byType.set(component_type, elementsOfType);
            }
            if (indexConfig.byRelation && internalStore.indexes.byRelation) {
              const elementEntries = Object.entries(newElm);
              for (const [key, value] of elementEntries) {
                if (key.endsWith("_id") && key !== `${newElm.type}_id` && typeof value === "string") {
                  const relationTypeMap = internalStore.indexes.byRelation.get(key) || /* @__PURE__ */ new Map();
                  const relatedElements = relationTypeMap.get(value) || [];
                  relatedElements.push(newElm);
                  relationTypeMap.set(value, relatedElements);
                  internalStore.indexes.byRelation.set(key, relationTypeMap);
                }
              }
            }
            if (indexConfig.bySubcircuit && internalStore.indexes.bySubcircuit && "subcircuit_id" in newElm) {
              const subcircuitId = newElm.subcircuit_id;
              if (subcircuitId && typeof subcircuitId === "string") {
                const subcircuitElements = internalStore.indexes.bySubcircuit.get(subcircuitId) || [];
                subcircuitElements.push(newElm);
                internalStore.indexes.bySubcircuit.set(
                  subcircuitId,
                  subcircuitElements
                );
              }
            }
            if (indexConfig.byCustomField && internalStore.indexes.byCustomField) {
              for (const field of indexConfig.byCustomField) {
                if (field in newElm) {
                  const fieldValue = newElm[field];
                  if (fieldValue !== void 0 && (typeof fieldValue === "string" || typeof fieldValue === "number")) {
                    const fieldValueStr = String(fieldValue);
                    const fieldMap = internalStore.indexes.byCustomField.get(field);
                    const elementsWithFieldValue = fieldMap.get(fieldValueStr) || [];
                    elementsWithFieldValue.push(newElm);
                    fieldMap.set(fieldValueStr, elementsWithFieldValue);
                  }
                }
              }
            }
            return newElm;
          },
          delete: (id) => {
            const indexConfig = options.indexConfig || {};
            let elm;
            if (indexConfig.byId && internalStore.indexes.byId) {
              elm = internalStore.indexes.byId.get(`${component_type}:${id}`);
            } else if (indexConfig.byType && internalStore.indexes.byType) {
              const elementsOfType = internalStore.indexes.byType.get(component_type) || [];
              elm = elementsOfType.find(
                (e) => e[`${component_type}_id`] === id
              );
            } else {
              elm = soup.find((e) => e[`${component_type}_id`] === id);
            }
            if (!elm) return;
            const elmIndex = soup.indexOf(elm);
            if (elmIndex >= 0) {
              soup.splice(elmIndex, 1);
              internalStore.editCount++;
            }
            if (indexConfig.byId && internalStore.indexes.byId) {
              const idKey = createIdKey(elm);
              internalStore.indexes.byId.delete(idKey);
            }
            if (indexConfig.byType && internalStore.indexes.byType) {
              const elementsOfType = internalStore.indexes.byType.get(component_type) || [];
              const filteredElements = elementsOfType.filter(
                (e) => e[`${component_type}_id`] !== id
              );
              internalStore.indexes.byType.set(component_type, filteredElements);
            }
            if (indexConfig.byRelation && internalStore.indexes.byRelation) {
              for (const [
                relationKey,
                relationMap
              ] of internalStore.indexes.byRelation.entries()) {
                for (const [relationValue, elements] of relationMap.entries()) {
                  const updatedElements = elements.filter((e) => e !== elm);
                  if (updatedElements.length === 0) {
                    relationMap.delete(relationValue);
                  } else {
                    relationMap.set(relationValue, updatedElements);
                  }
                }
              }
            }
            if (indexConfig.bySubcircuit && internalStore.indexes.bySubcircuit && "subcircuit_id" in elm) {
              const subcircuitId = elm.subcircuit_id;
              if (subcircuitId) {
                const subcircuitElements = internalStore.indexes.bySubcircuit.get(subcircuitId) || [];
                const updatedElements = subcircuitElements.filter(
                  (e) => e !== elm
                );
                if (updatedElements.length === 0) {
                  internalStore.indexes.bySubcircuit.delete(subcircuitId);
                } else {
                  internalStore.indexes.bySubcircuit.set(
                    subcircuitId,
                    updatedElements
                  );
                }
              }
            }
            if (indexConfig.byCustomField && internalStore.indexes.byCustomField) {
              for (const fieldMap of internalStore.indexes.byCustomField.values()) {
                for (const [fieldValue, elements] of fieldMap.entries()) {
                  const updatedElements = elements.filter((e) => e !== elm);
                  if (updatedElements.length === 0) {
                    fieldMap.delete(fieldValue);
                  } else {
                    fieldMap.set(fieldValue, updatedElements);
                  }
                }
              }
            }
          },
          update: (id, newProps) => {
            const indexConfig = options.indexConfig || {};
            let elm;
            if (indexConfig.byId && internalStore.indexes.byId) {
              elm = internalStore.indexes.byId.get(`${component_type}:${id}`);
            } else if (indexConfig.byType && internalStore.indexes.byType) {
              const elementsOfType = internalStore.indexes.byType.get(component_type) || [];
              elm = elementsOfType.find(
                (e) => e[`${component_type}_id`] === id
              );
            } else {
              elm = soup.find(
                (e) => e.type === component_type && e[`${component_type}_id`] === id
              );
            }
            if (!elm) return null;
            if (indexConfig.byRelation && internalStore.indexes.byRelation) {
              const elementEntries = Object.entries(elm);
              for (const [key, value] of elementEntries) {
                if (key.endsWith("_id") && key !== `${elm.type}_id` && typeof value === "string") {
                  if (key in newProps && newProps[key] !== value) {
                    const relationTypeMap = internalStore.indexes.byRelation.get(key);
                    if (relationTypeMap) {
                      const relatedElements = relationTypeMap.get(value) || [];
                      const updatedElements = relatedElements.filter(
                        (e) => e !== elm
                      );
                      if (updatedElements.length === 0) {
                        relationTypeMap.delete(value);
                      } else {
                        relationTypeMap.set(value, updatedElements);
                      }
                    }
                  }
                }
              }
            }
            if (indexConfig.bySubcircuit && internalStore.indexes.bySubcircuit && "subcircuit_id" in elm && "subcircuit_id" in newProps) {
              const oldSubcircuitId = elm.subcircuit_id;
              const newSubcircuitId = newProps.subcircuit_id;
              if (oldSubcircuitId !== newSubcircuitId) {
                const subcircuitElements = internalStore.indexes.bySubcircuit.get(oldSubcircuitId) || [];
                const updatedElements = subcircuitElements.filter(
                  (e) => e !== elm
                );
                if (updatedElements.length === 0) {
                  internalStore.indexes.bySubcircuit.delete(oldSubcircuitId);
                } else {
                  internalStore.indexes.bySubcircuit.set(
                    oldSubcircuitId,
                    updatedElements
                  );
                }
              }
            }
            if (indexConfig.byCustomField && internalStore.indexes.byCustomField) {
              for (const field of indexConfig.byCustomField) {
                if (field in elm && field in newProps && elm[field] !== newProps[field]) {
                  const fieldMap = internalStore.indexes.byCustomField.get(field);
                  if (fieldMap) {
                    const oldValue = String(elm[field]);
                    const elements = fieldMap.get(oldValue) || [];
                    const updatedElements = elements.filter((e) => e !== elm);
                    if (updatedElements.length === 0) {
                      fieldMap.delete(oldValue);
                    } else {
                      fieldMap.set(oldValue, updatedElements);
                    }
                  }
                }
              }
            }
            Object.assign(elm, newProps);
            internalStore.editCount++;
            if (indexConfig.byRelation && internalStore.indexes.byRelation) {
              const elementEntries = Object.entries(elm);
              for (const [key, value] of elementEntries) {
                if (key.endsWith("_id") && key !== `${elm.type}_id` && typeof value === "string") {
                  if (key in newProps) {
                    const relationTypeMap = internalStore.indexes.byRelation.get(key) || /* @__PURE__ */ new Map();
                    const relatedElements = relationTypeMap.get(value) || [];
                    if (!relatedElements.includes(elm)) {
                      relatedElements.push(elm);
                      relationTypeMap.set(value, relatedElements);
                      internalStore.indexes.byRelation.set(key, relationTypeMap);
                    }
                  }
                }
              }
            }
            if (indexConfig.bySubcircuit && internalStore.indexes.bySubcircuit && "subcircuit_id" in elm && "subcircuit_id" in newProps) {
              const subcircuitId = elm.subcircuit_id;
              if (subcircuitId && typeof subcircuitId === "string") {
                const subcircuitElements = internalStore.indexes.bySubcircuit.get(subcircuitId) || [];
                if (!subcircuitElements.includes(elm)) {
                  subcircuitElements.push(elm);
                  internalStore.indexes.bySubcircuit.set(
                    subcircuitId,
                    subcircuitElements
                  );
                }
              }
            }
            if (indexConfig.byCustomField && internalStore.indexes.byCustomField) {
              for (const field of indexConfig.byCustomField) {
                if (field in elm && field in newProps) {
                  const fieldValue = elm[field];
                  if (fieldValue !== void 0 && (typeof fieldValue === "string" || typeof fieldValue === "number")) {
                    const fieldValueStr = String(fieldValue);
                    const fieldMap = internalStore.indexes.byCustomField.get(field);
                    const elementsWithFieldValue = fieldMap.get(fieldValueStr) || [];
                    if (!elementsWithFieldValue.includes(elm)) {
                      elementsWithFieldValue.push(elm);
                      fieldMap.set(fieldValueStr, elementsWithFieldValue);
                    }
                  }
                }
              }
            }
            return elm;
          },
          select: (selector) => {
            if (component_type === "source_component") {
              return soup.find(
                (e) => e.type === "source_component" && e.name === selector.replace(/\./g, "")
              ) || null;
            } else if (component_type === "pcb_port" || component_type === "source_port" || component_type === "schematic_port") {
              const [component_name, port_selector] = selector.replace(/\./g, "").split(/[\s\>]+/);
              const source_component = soup.find(
                (e) => e.type === "source_component" && e.name === component_name
              );
              if (!source_component) return null;
              const source_port = soup.find(
                (e) => e.type === "source_port" && e.source_component_id === source_component.source_component_id && (e.name === port_selector || (e.port_hints ?? []).includes(port_selector))
              );
              if (!source_port) return null;
              if (component_type === "source_port")
                return source_port;
              if (component_type === "pcb_port") {
                return soup.find(
                  (e) => e.type === "pcb_port" && e.source_port_id === source_port.source_port_id
                ) || null;
              } else if (component_type === "schematic_port") {
                return soup.find(
                  (e) => e.type === "schematic_port" && e.source_port_id === source_port.source_port_id
                ) || null;
              }
            }
            return null;
          }
        };
      }
    }
  );
  return suIndexed;
});
cjuIndexed.unparsed = cjuIndexed;
var cju_indexed_default = cjuIndexed;

// lib/transform-soup-elements.ts
import {
  applyToPoint,
  compose,
  decomposeTSR,
  rotateDEG
} from "transformation-matrix";

// lib/direction-to-vec.ts
var directionToVec = (direction) => {
  if (direction === "up") return { x: 0, y: 1 };
  else if (direction === "down") return { x: 0, y: -1 };
  else if (direction === "left") return { x: -1, y: 0 };
  else if (direction === "right") return { x: 1, y: 0 };
  else throw new Error("Invalid direction");
};
var vecToDirection = ({ x, y }) => {
  if (x > y) y = 0;
  if (y > x) x = 0;
  if (x > 0 && y === 0) return "right";
  else if (x < 0 && y === 0) return "left";
  else if (x === 0 && y > 0) return "up";
  else if (x === 0 && y < 0) return "down";
  else throw new Error(`Invalid vector for direction conversion (${x}, ${y})`);
};
var rotateClockwise = (direction) => {
  if (direction === "up") return "right";
  else if (direction === "right") return "down";
  else if (direction === "down") return "left";
  else if (direction === "left") return "up";
  throw new Error(`Invalid direction: ${direction}`);
};
var rotateCounterClockwise = (direction) => {
  if (direction === "up") return "left";
  else if (direction === "left") return "down";
  else if (direction === "down") return "right";
  else if (direction === "right") return "up";
  throw new Error(`Invalid direction: ${direction}`);
};
var rotateDirection = (direction, num90DegreeClockwiseTurns) => {
  while (num90DegreeClockwiseTurns > 0) {
    direction = rotateClockwise(direction);
    num90DegreeClockwiseTurns--;
  }
  while (num90DegreeClockwiseTurns < 0) {
    direction = rotateCounterClockwise(direction);
    num90DegreeClockwiseTurns++;
  }
  return direction;
};
var oppositeDirection = (direction) => {
  if (direction === "up") return "down";
  else if (direction === "down") return "up";
  else if (direction === "left") return "right";
  else if (direction === "right") return "left";
  throw new Error(`Invalid direction: ${direction}`);
};
var oppositeSide = (sideOrDir) => {
  if (sideOrDir === "top" || sideOrDir === "up") return "bottom";
  else if (sideOrDir === "bottom" || sideOrDir === "down") return "top";
  else if (sideOrDir === "left") return "right";
  else if (sideOrDir === "right") return "left";
  throw new Error(`Invalid sideOrDir: ${sideOrDir}`);
};

// lib/transform-soup-elements.ts
var getQuarterTurns = (angleRadians) => Math.round(angleRadians / (Math.PI / 2));
var insertionDirectionToVec = (direction) => {
  switch (direction) {
    case "from_left":
      return { x: -1, y: 0 };
    case "from_right":
      return { x: 1, y: 0 };
    case "from_top":
      return { x: 0, y: 1 };
    case "from_bottom":
      return { x: 0, y: -1 };
  }
};
var vecToInsertionDirection = ({
  x,
  y
}) => {
  if (x > 0) return "from_right";
  if (x < 0) return "from_left";
  if (y > 0) return "from_top";
  return "from_bottom";
};
var transformInsertionDirection = (direction, opts) => {
  if (!direction) return direction;
  if (direction === "from_above" || direction === "from_below") {
    if (!opts.isFlipped) return direction;
    return direction === "from_above" ? "from_below" : "from_above";
  }
  let { x, y } = insertionDirectionToVec(direction);
  let quarterTurns = Math.round(opts.rotationDegrees / 90);
  while (quarterTurns > 0) {
    ;
    [x, y] = [-y, x];
    quarterTurns--;
  }
  while (quarterTurns < 0) {
    ;
    [x, y] = [y, -x];
    quarterTurns++;
  }
  if (opts.isFlipped) {
    y = -y;
  }
  return vecToInsertionDirection({ x, y });
};
var transformSchematicElement = (elm, matrix) => {
  if (elm.type === "schematic_component") {
    elm.center = applyToPoint(matrix, elm.center);
  } else if (elm.type === "schematic_port") {
    elm.center = applyToPoint(matrix, elm.center);
    if (elm.facing_direction) {
      elm.facing_direction = rotateDirection(
        elm.facing_direction,
        -(Math.atan2(matrix.b, matrix.a) / Math.PI) * 2
      );
    }
  } else if (elm.type === "schematic_text") {
    elm.position = applyToPoint(matrix, elm.position);
  } else if (elm.type === "schematic_trace") {
    const anyElm = elm;
    anyElm.route = (anyElm.route ?? []).map((rp) => {
      const tp = applyToPoint(matrix, rp);
      rp.x = tp.x;
      rp.y = tp.y;
      return rp;
    });
    if (Array.isArray(anyElm.junctions)) {
      anyElm.junctions = anyElm.junctions.map((j) => {
        const tp = applyToPoint(matrix, j);
        j.x = tp.x;
        j.y = tp.y;
        return j;
      });
    }
    if (Array.isArray(anyElm.edges)) {
      anyElm.edges = anyElm.edges.map((e) => {
        e.from = applyToPoint(matrix, e.from);
        e.to = applyToPoint(matrix, e.to);
        return e;
      });
    }
  } else if (elm.type === "schematic_box") {
    const { x, y } = applyToPoint(matrix, { x: elm.x, y: elm.y });
    elm.x = x;
    elm.y = y;
  } else if (elm.type === "schematic_line") {
    const { x: x1, y: y1 } = applyToPoint(matrix, { x: elm.x1, y: elm.y1 });
    const { x: x2, y: y2 } = applyToPoint(matrix, { x: elm.x2, y: elm.y2 });
    elm.x1 = x1;
    elm.y1 = y1;
    elm.x2 = x2;
    elm.y2 = y2;
  }
  return elm;
};
var transformSchematicElements = (elms, matrix) => {
  return elms.map((elm) => transformSchematicElement(elm, matrix));
};
var transformPcbSoldermaskOpening = (opening, matrix) => {
  if (opening.shape === "polygon") {
    opening.points = opening.points.map((point) => applyToPoint(matrix, point));
    return opening;
  }
  const center = applyToPoint(matrix, { x: opening.x, y: opening.y });
  opening.x = center.x;
  opening.y = center.y;
  if (opening.shape === "circle") return opening;
  const rectRotation = opening.shape === "rotated_rect" ? opening.ccw_rotation : 0;
  const isReflected = matrix.a * matrix.d - matrix.b * matrix.c < 0;
  const transformedRotation = decomposeTSR(compose(matrix, rotateDEG(rectRotation)), false, isReflected).rotation.angle * 180 / Math.PI;
  if (Math.abs(transformedRotation) < 1e-8) {
    Object.assign(opening, { shape: "rect" });
    Reflect.deleteProperty(opening, "ccw_rotation");
  } else {
    Object.assign(opening, {
      shape: "rotated_rect",
      ccw_rotation: transformedRotation
    });
  }
  return opening;
};
var transformPCBElement = (elm, matrix) => {
  if (elm.type === "pcb_soldermask_opening") {
    return transformPcbSoldermaskOpening(elm, matrix);
  }
  const tsr = decomposeTSR(matrix);
  const flipPadWidthHeight = Math.abs(getQuarterTurns(tsr.rotation.angle)) % 2 === 1;
  const rotationDegrees = tsr.rotation.angle / Math.PI * 180;
  const isFlipped = tsr.scale.sy < 0;
  if (elm.type === "pcb_plated_hole" || elm.type === "pcb_hole" || elm.type === "pcb_via" || elm.type === "pcb_smtpad" || elm.type === "pcb_solder_paste" || elm.type === "pcb_port") {
    const { x, y } = applyToPoint(matrix, {
      x: Number(elm.x),
      y: Number(elm.y)
    });
    elm.x = x;
    elm.y = y;
    if (elm.type === "pcb_smtpad" && elm.shape === "polygon" && Array.isArray(elm.points)) {
      elm.points = elm.points.map((point) => {
        const tp = applyToPoint(matrix, { x: point.x, y: point.y });
        return {
          x: tp.x,
          y: tp.y
        };
      });
    }
  } else if (elm.type === "pcb_keepout" && elm.shape === "outline") {
    elm.outline = elm.outline.map((point) => applyToPoint(matrix, point));
  } else if (elm.type === "pcb_keepout" || elm.type === "pcb_board") {
    elm.center = applyToPoint(matrix, elm.center);
  } else if (elm.type === "pcb_silkscreen_text" || elm.type === "pcb_fabrication_note_text" || elm.type === "pcb_note_text") {
    elm.anchor_position = applyToPoint(matrix, elm.anchor_position);
  } else if (elm.type === "pcb_copper_text") {
    if (elm.anchor_position) {
      elm.anchor_position = applyToPoint(matrix, elm.anchor_position);
    }
  } else if (elm.type === "pcb_courtyard_rect") {
    elm.center = applyToPoint(matrix, elm.center);
    elm.ccw_rotation = ((elm.ccw_rotation ?? 0) + rotationDegrees) % 360;
  } else if (elm.type === "pcb_silkscreen_circle" || elm.type === "pcb_silkscreen_rect" || elm.type === "pcb_silkscreen_pill" || elm.type === "pcb_silkscreen_oval" || elm.type === "pcb_note_rect" || elm.type === "pcb_courtyard_circle") {
    elm.center = applyToPoint(matrix, elm.center);
  } else if (elm.type === "pcb_component") {
    elm.center = applyToPoint(matrix, elm.center);
    elm.rotation = elm.rotation + rotationDegrees;
    elm.rotation = elm.rotation % 360;
    if (elm.cable_insertion_center) {
      elm.cable_insertion_center = applyToPoint(
        matrix,
        elm.cable_insertion_center
      );
    }
    elm.insertion_direction = transformInsertionDirection(
      elm.insertion_direction,
      {
        rotationDegrees,
        isFlipped
      }
    );
    if (flipPadWidthHeight) {
      ;
      [elm.width, elm.height] = [elm.height, elm.width];
    }
  } else if (elm.type === "pcb_courtyard_outline") {
    elm.outline = elm.outline.map((p) => {
      const tp = applyToPoint(matrix, p);
      p.x = tp.x;
      p.y = tp.y;
      return p;
    });
  } else if (elm.type === "pcb_courtyard_polygon") {
    elm.points = elm.points.map((p) => {
      const tp = applyToPoint(matrix, p);
      p.x = tp.x;
      p.y = tp.y;
      return p;
    });
  } else if (elm.type === "pcb_trace") {
    elm.route = elm.route.map((rp) => {
      if (!("x" in rp)) {
        rp.start = applyToPoint(matrix, rp.start);
        rp.end = applyToPoint(matrix, rp.end);
        return rp;
      }
      const tp = applyToPoint(matrix, rp);
      rp.x = tp.x;
      rp.y = tp.y;
      return rp;
    });
  } else if (elm.type === "pcb_silkscreen_path" || elm.type === "pcb_trace_hint" || elm.type === "pcb_fabrication_note_path" || elm.type === "pcb_note_path") {
    elm.route = elm.route.map((rp) => {
      const tp = applyToPoint(matrix, rp);
      rp.x = tp.x;
      rp.y = tp.y;
      return rp;
    });
  } else if (elm.type === "pcb_silkscreen_line" || elm.type === "pcb_note_line") {
    const p1 = { x: elm.x1, y: elm.y1 };
    const p2 = { x: elm.x2, y: elm.y2 };
    const p1t = applyToPoint(matrix, p1);
    const p2t = applyToPoint(matrix, p2);
    elm.x1 = p1t.x;
    elm.y1 = p1t.y;
    elm.x2 = p2t.x;
    elm.y2 = p2t.y;
  } else if (elm.type === "cad_component") {
    const newPos = applyToPoint(matrix, {
      x: elm.position.x,
      y: elm.position.y
    });
    elm.position.x = newPos.x;
    elm.position.y = newPos.y;
  }
  return elm;
};
var transformPCBElements = (elms, matrix) => {
  const tsr = decomposeTSR(matrix);
  const quarterTurns = getQuarterTurns(tsr.rotation.angle);
  const flipPadWidthHeight = Math.abs(quarterTurns) % 2 === 1;
  let transformedElms = elms.map((elm) => transformPCBElement(elm, matrix));
  if (flipPadWidthHeight) {
    transformedElms = transformedElms.map((elm) => {
      if ((elm.type === "pcb_smtpad" || elm.type === "pcb_solder_paste") && (elm.shape === "rect" || elm.shape === "pill")) {
        ;
        [elm.width, elm.height] = [elm.height, elm.width];
      }
      return elm;
    });
  }
  return transformedElms;
};

// lib/apply-selector.ts
import * as parsel from "parsel-js";

// lib/convert-abbreviation-to-soup-element-type.ts
var convertAbbrToType = (abbr) => {
  switch (abbr) {
    case "port":
      return "source_port";
    case "net":
      return "source_net";
    case "power":
      return "simple_power_source";
    case "silkscreenpath":
      return "pcb_silkscreen_path";
  }
  return abbr;
};

// lib/apply-selector.ts
var filterByType = (elements, type) => {
  type = convertAbbrToType(type);
  return elements.filter(
    (elm) => "ftype" in elm && elm.ftype === type || elm.type === type
  );
};
var applySelector = (elements, selectorRaw) => {
  const selectorAST = parsel.parse(selectorRaw);
  return applySelectorAST(elements, selectorAST);
};
var doesElmMatchClassName = (elm, className) => "name" in elm && elm.name === className || "port_hints" in elm && elm.port_hints?.includes(className);
var applySelectorAST = (elements, selectorAST) => {
  switch (selectorAST.type) {
    case "complex": {
      switch (selectorAST.combinator) {
        case " ":
        // TODO technically should do a deep search
        case ">": {
          const { left, right } = selectorAST;
          if (left.type === "class" || left.type === "type") {
            let matchElms;
            if (left.type === "class") {
              matchElms = elements.filter(
                (elm) => doesElmMatchClassName(elm, left.name)
              );
            } else if (left.type === "type") {
              matchElms = filterByType(elements, left.name);
            } else {
              matchElms = [];
            }
            const childrenOfMatchingElms = matchElms.flatMap(
              (matchElm) => elements.filter(
                (elm) => elm[`${matchElm.type}_id`] === matchElm[`${matchElm.type}_id`] && elm !== matchElm
              )
            );
            return applySelectorAST(childrenOfMatchingElms, right);
          } else {
            throw new Error(`unsupported selector type "${left.type}" `);
          }
        }
        default: {
          throw new Error(
            `Couldn't apply selector AST for complex combinator "${selectorAST.combinator}"`
          );
        }
      }
      return [];
    }
    case "compound": {
      const conditionsToMatch = selectorAST.list.map((part) => {
        switch (part.type) {
          case "class": {
            return (elm) => doesElmMatchClassName(elm, part.name);
          }
          case "type": {
            const name = convertAbbrToType(part.name);
            return (elm) => elm.type === name;
          }
        }
      });
      return elements.filter(
        (elm) => conditionsToMatch.every((condFn) => condFn?.(elm))
      );
    }
    case "type": {
      return filterByType(elements, selectorAST.name);
    }
    case "class": {
      return elements.filter(
        (elm) => doesElmMatchClassName(elm, selectorAST.name)
      );
    }
    default: {
      throw new Error(
        `Couldn't apply selector AST for type: "${selectorAST.type}" ${JSON.stringify(selectorAST, null, " ")}`
      );
    }
  }
};

// lib/get-element-id.ts
var getElementId = (elm) => {
  const type = elm.type;
  const id = elm[`${type}_id`];
  return id;
};

// lib/get-element-by-id.ts
var getElementById = (soup, id) => {
  return soup.find((elm) => getElementId(elm) === id) ?? null;
};

// lib/readable-name-functions/get-readable-name-for-pcb-port.ts
var getReadableNameForPcbPort = (soup, pcb_port_id) => {
  const pcbPort = cju(soup).pcb_port.get(pcb_port_id);
  if (!pcbPort) {
    return `pcb_port[#${pcb_port_id}]`;
  }
  const pcbComponent = pcbPort.pcb_component_id ? cju(soup).pcb_component.get(pcbPort.pcb_component_id) : void 0;
  if (!pcbComponent) {
    return `pcb_port[#${pcb_port_id}]`;
  }
  const sourceComponent = cju(soup).source_component.get(
    pcbComponent.source_component_id
  );
  if (!sourceComponent) {
    return `pcb_port[#${pcb_port_id}]`;
  }
  const sourcePort = cju(soup).source_port.get(pcbPort.source_port_id);
  if (!sourcePort) {
    return `pcb_port[#${pcb_port_id}]`;
  }
  let padIdentifier;
  if (sourcePort?.port_hints && sourcePort.port_hints.length > 0) {
    padIdentifier = sourcePort.port_hints[0];
  } else if (sourcePort.port_hints && sourcePort.port_hints.length > 0) {
    padIdentifier = sourcePort.port_hints[0];
  } else {
    padIdentifier = pcb_port_id;
  }
  return `pcb_port[.${sourceComponent.name} > .${padIdentifier}]`;
};

// lib/readable-name-functions/get-readable-name-for-pcb-smtpad.ts
function getReadableNameForPcbSmtpad(soup, pcb_smtpad_id) {
  const pcbSmtpad = cju(soup).pcb_smtpad.get(pcb_smtpad_id);
  if (!pcbSmtpad || !pcbSmtpad.pcb_port_id) {
    return `smtpad[${pcb_smtpad_id}]`;
  }
  return getReadableNameForPcbPort(soup, pcbSmtpad.pcb_port_id);
}

// lib/readable-name-functions/get-readable-name-for-pcb-trace.ts
function getReadableNameForPcbTrace(soup, pcb_trace_id) {
  const pcbTrace = cju(soup).pcb_trace.get(pcb_trace_id);
  if (!pcbTrace) {
    return `trace[${pcb_trace_id}]`;
  }
  const connectedPcbPortIds = pcbTrace.route.flatMap((point) => [point.start_pcb_port_id, point.end_pcb_port_id]).filter(Boolean);
  if (connectedPcbPortIds.length === 0) {
    return `trace[${pcb_trace_id}]`;
  }
  function getComponentAndPortInfo(pcb_port_id) {
    const pcbPort = cju(soup).pcb_port.get(pcb_port_id);
    if (!pcbPort) return null;
    const pcbComponent = pcbPort.pcb_component_id ? cju(soup).pcb_component.get(pcbPort.pcb_component_id) : void 0;
    if (!pcbComponent) return null;
    const sourceComponent = cju(soup).source_component.get(
      pcbComponent.source_component_id
    );
    if (!sourceComponent) return null;
    const sourcePort = cju(soup).source_port.get(pcbPort.source_port_id);
    const portHint = sourcePort?.port_hints ? sourcePort.port_hints[1] : "";
    return {
      componentName: sourceComponent.name,
      portHint
    };
  }
  const selectorParts = connectedPcbPortIds.map((portId) => {
    const info = getComponentAndPortInfo(portId);
    if (info) {
      return `.${info.componentName} > port.${info.portHint}`;
    }
    return `port[${portId}]`;
  });
  return `trace[${selectorParts.join(", ")}]`;
}

// lib/readable-name-functions/get-readable-name-for-element.ts
var getReadableNameForElement = (soup, elm) => {
  if (typeof elm === "string") {
    const elmObj = getElementById(soup, elm);
    if (!elmObj) `unknown (could not find element with id ${elm})`;
    return getReadableNameForElement(soup, elmObj);
  }
  switch (elm.type) {
    case "pcb_port":
      return getReadableNameForPcbPort(soup, elm.pcb_port_id);
    case "pcb_smtpad":
      return getReadableNameForPcbSmtpad(soup, elm.pcb_smtpad_id);
    case "pcb_trace":
      return getReadableNameForPcbTrace(soup, elm.pcb_trace_id);
    case "source_component":
      return `source_component[${elm.name}]`;
    default:
      return `${elm.type}[#${getElementId(elm)}]`;
  }
};

// lib/get-bounds-of-pcb-elements.ts
var mergeBounds = (currentBounds, nextBounds) => ({
  minX: Math.min(currentBounds.minX, nextBounds.minX),
  minY: Math.min(currentBounds.minY, nextBounds.minY),
  maxX: Math.max(currentBounds.maxX, nextBounds.maxX),
  maxY: Math.max(currentBounds.maxY, nextBounds.maxY)
});
var getCircleBounds = (x, y, diameter) => {
  const radius = diameter / 2;
  return {
    minX: x - radius,
    minY: y - radius,
    maxX: x + radius,
    maxY: y + radius
  };
};
var getRotatedRectBounds = (x, y, width, height, rotationDegrees) => {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const theta = rotationDegrees * Math.PI / 180;
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  const corners = [
    { x: -halfWidth, y: -halfHeight },
    { x: halfWidth, y: -halfHeight },
    { x: halfWidth, y: halfHeight },
    { x: -halfWidth, y: halfHeight }
  ].map((corner) => ({
    x: x + corner.x * cosTheta - corner.y * sinTheta,
    y: y + corner.x * sinTheta + corner.y * cosTheta
  }));
  return {
    minX: Math.min(...corners.map((corner) => corner.x)),
    minY: Math.min(...corners.map((corner) => corner.y)),
    maxX: Math.max(...corners.map((corner) => corner.x)),
    maxY: Math.max(...corners.map((corner) => corner.y))
  };
};
var getRotatedOvalBounds = (x, y, width, height, rotationDegrees) => {
  const radiusX = width / 2;
  const radiusY = height / 2;
  const theta = rotationDegrees * Math.PI / 180;
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  const halfWidth = Math.hypot(radiusX * cosTheta, radiusY * sinTheta);
  const halfHeight = Math.hypot(radiusX * sinTheta, radiusY * cosTheta);
  return {
    minX: x - halfWidth,
    minY: y - halfHeight,
    maxX: x + halfWidth,
    maxY: y + halfHeight
  };
};
var getRotatedPillBounds = (x, y, width, height, rotationDegrees) => {
  const radius = Math.min(width, height) / 2;
  const halfLineLength = Math.max(width, height) / 2 - radius;
  const theta = rotationDegrees * Math.PI / 180;
  const axis = width >= height ? { x: halfLineLength, y: 0 } : { x: 0, y: halfLineLength };
  const rotatedAxis = {
    x: axis.x * Math.cos(theta) - axis.y * Math.sin(theta),
    y: axis.x * Math.sin(theta) + axis.y * Math.cos(theta)
  };
  const halfWidth = Math.abs(rotatedAxis.x) + radius;
  const halfHeight = Math.abs(rotatedAxis.y) + radius;
  return {
    minX: x - halfWidth,
    minY: y - halfHeight,
    maxX: x + halfWidth,
    maxY: y + halfHeight
  };
};
var getBoundsFromPoints = (points) => {
  if (points.length === 0) return null;
  return {
    minX: Math.min(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
    maxX: Math.max(...points.map((point) => point.x)),
    maxY: Math.max(...points.map((point) => point.y))
  };
};
var getRoutePoints = (route) => {
  if (!Array.isArray(route)) return [];
  return route.flatMap((point) => {
    if (!point || typeof point !== "object") return [];
    if ("x" in point && "y" in point && typeof point.x === "number" && typeof point.y === "number") {
      return [{ x: point.x, y: point.y }];
    }
    if ("start" in point && "end" in point) {
      const positions = [point.start, point.end];
      return positions.filter(
        (position) => Boolean(
          position && typeof position === "object" && "x" in position && "y" in position && typeof position.x === "number" && typeof position.y === "number"
        )
      );
    }
    return [];
  });
};
var getPcbElementBounds = (elm) => {
  if (!elm.type.startsWith("pcb_")) return null;
  if (elm.type === "pcb_smtpad" && elm.shape === "polygon" && Array.isArray(elm.points)) {
    return getBoundsFromPoints(elm.points);
  }
  if (elm.type === "pcb_hole" && elm.hole_shape === "circle") {
    return getCircleBounds(elm.x, elm.y, elm.hole_diameter);
  }
  if (elm.type === "pcb_plated_hole") {
    let platedHoleBounds;
    if ("outer_diameter" in elm && typeof elm.outer_diameter === "number") {
      platedHoleBounds = getCircleBounds(elm.x, elm.y, elm.outer_diameter);
    } else if ("hole_diameter" in elm && typeof elm.hole_diameter === "number") {
      platedHoleBounds = getCircleBounds(elm.x, elm.y, elm.hole_diameter);
    }
    if ((elm.shape === "oval" || elm.shape === "pill") && typeof elm.outer_width === "number" && typeof elm.outer_height === "number") {
      const getOuterBounds = elm.shape === "pill" ? getRotatedPillBounds : getRotatedOvalBounds;
      platedHoleBounds = getOuterBounds(
        elm.x,
        elm.y,
        elm.outer_width,
        elm.outer_height,
        elm.ccw_rotation ?? 0
      );
    }
    if ("rect_pad_width" in elm && typeof elm.rect_pad_width === "number" && "rect_pad_height" in elm && typeof elm.rect_pad_height === "number") {
      const rectBounds = getRotatedRectBounds(
        elm.x,
        elm.y,
        elm.rect_pad_width,
        elm.rect_pad_height,
        "rect_ccw_rotation" in elm ? elm.rect_ccw_rotation ?? 0 : 0
      );
      platedHoleBounds = platedHoleBounds ? mergeBounds(platedHoleBounds, rectBounds) : rectBounds;
    }
    if ("hole_diameter" in elm && typeof elm.hole_diameter === "number") {
      const drillBounds = getCircleBounds(
        elm.x + ("hole_offset_x" in elm ? elm.hole_offset_x ?? 0 : 0),
        elm.y + ("hole_offset_y" in elm ? elm.hole_offset_y ?? 0 : 0),
        elm.hole_diameter
      );
      platedHoleBounds = platedHoleBounds ? mergeBounds(platedHoleBounds, drillBounds) : drillBounds;
    }
    if (platedHoleBounds) return platedHoleBounds;
  }
  const elementRecord = elm;
  const routeBounds = getBoundsFromPoints(getRoutePoints(elementRecord.route));
  if (routeBounds) return routeBounds;
  const outlineBounds = getBoundsFromPoints(
    getRoutePoints(elementRecord.outline)
  );
  if (outlineBounds) return outlineBounds;
  const pointsBounds = getBoundsFromPoints(getRoutePoints(elementRecord.points));
  if (pointsBounds) return pointsBounds;
  let centerX;
  let centerY;
  let width;
  let height;
  if ("x" in elm && "y" in elm) {
    centerX = Number(elm.x);
    centerY = Number(elm.y);
  }
  if ("outer_diameter" in elm) {
    width = Number(elm.outer_diameter);
    height = Number(elm.outer_diameter);
  }
  if ("width" in elm) {
    width = Number(elm.width);
  }
  if ("height" in elm) {
    height = Number(elm.height);
  }
  if ("center" in elm && elm.center && typeof elm.center === "object" && "x" in elm.center && "y" in elm.center) {
    centerX = Number(elm.center.x);
    centerY = Number(elm.center.y);
  }
  let rotation = 0;
  if ("rotation" in elm && typeof elm.rotation === "number") {
    rotation = elm.rotation;
  }
  if ("ccw_rotation" in elm && typeof elm.ccw_rotation === "number") {
    rotation = elm.ccw_rotation;
  }
  if (centerX !== void 0 && centerY !== void 0) {
    if (width !== void 0 && height !== void 0) {
      return rotation ? getRotatedRectBounds(centerX, centerY, width, height, rotation) : {
        minX: centerX - width / 2,
        minY: centerY - height / 2,
        maxX: centerX + width / 2,
        maxY: centerY + height / 2
      };
    }
    if ("radius" in elm && typeof elm.radius === "number") {
      return getCircleBounds(centerX, centerY, elm.radius * 2);
    }
    return { minX: centerX, minY: centerY, maxX: centerX, maxY: centerY };
  }
  const anchoredPoint = [elementRecord.anchor_position, elementRecord.position].filter(
    (position) => Boolean(
      position && typeof position === "object" && "x" in position && "y" in position && typeof position.x === "number" && typeof position.y === "number"
    )
  ).at(0);
  return anchoredPoint ? {
    minX: anchoredPoint.x,
    minY: anchoredPoint.y,
    maxX: anchoredPoint.x,
    maxY: anchoredPoint.y
  } : null;
};
var getBoundsOfPcbElements = (elements) => {
  let bounds = {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY
  };
  for (const element of elements) {
    const elementBounds = getPcbElementBounds(element);
    if (elementBounds) bounds = mergeBounds(bounds, elementBounds);
  }
  return bounds;
};
var getPcbElementsWithinBounds = (elements, bounds) => elements.filter((element) => {
  const elementBounds = getPcbElementBounds(element);
  if (!elementBounds) return false;
  return elementBounds.minX <= bounds.maxX && elementBounds.maxX >= bounds.minX && elementBounds.minY <= bounds.maxY && elementBounds.maxY >= bounds.minY;
});

// lib/get-board-bounds.ts
var getBoardBounds = (board) => {
  if (board.width && board.height && board.center) {
    const halfWidth = board.width / 2;
    const halfHeight = board.height / 2;
    return {
      minX: board.center.x - halfWidth,
      minY: board.center.y - halfHeight,
      maxX: board.center.x + halfWidth,
      maxY: board.center.y + halfHeight,
      width: board.width,
      height: board.height,
      center: {
        x: board.center.x,
        y: board.center.y
      }
    };
  }
  if (!board.outline || board.outline.length === 0) {
    throw new Error(
      "Unable to compute board bounds. pcb_board must include width/height/center or a non-empty outline."
    );
  }
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const point of board.outline) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  const width = maxX - minX;
  const height = maxY - minY;
  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    center: {
      x: minX + width / 2,
      y: minY + height / 2
    }
  };
};

// lib/create-board-owner-map.ts
function createBoardOwnerMap(circuitJson) {
  const boardOwnerMap = /* @__PURE__ */ new Map();
  const parentById = /* @__PURE__ */ new Map();
  const boardsById = /* @__PURE__ */ new Map();
  for (const element of circuitJson) {
    switch (element.type) {
      case "pcb_board":
        boardsById.set(element.pcb_board_id, element);
        break;
      case "source_group": {
        const parentGroupId = element.parent_subcircuit_id ?? element.parent_source_group_id;
        parentById.set(
          element.source_group_id,
          element.subcircuit_id ?? parentGroupId
        );
        if (element.is_subcircuit && element.subcircuit_id) {
          parentById.set(element.subcircuit_id, parentGroupId);
        }
        break;
      }
      case "pcb_group":
        parentById.set(
          element.pcb_group_id,
          element.subcircuit_id ?? element.source_group_id
        );
        break;
      case "pcb_component":
        parentById.set(
          element.pcb_component_id,
          element.subcircuit_id ?? element.pcb_group_id
        );
        break;
      case "pcb_trace":
        parentById.set(
          element.pcb_trace_id,
          element.subcircuit_id ?? element.pcb_group_id ?? element.pcb_component_id
        );
        break;
      case "pcb_via":
        parentById.set(
          element.pcb_via_id,
          element.subcircuit_id ?? element.pcb_group_id ?? element.pcb_trace_id
        );
        break;
    }
  }
  const boards = [...boardsById.values()];
  for (const board of boards) {
    boardOwnerMap.set(board.pcb_board_id, board);
    if (board.subcircuit_id) {
      boardOwnerMap.set(board.subcircuit_id, board);
    }
  }
  const singleBoard = boards.length === 1 ? boards[0] : void 0;
  const resolvingIds = /* @__PURE__ */ new Set();
  function resolveBoard(id) {
    if (boardOwnerMap.has(id)) {
      return boardOwnerMap.get(id);
    }
    if (!parentById.has(id)) {
      return void 0;
    }
    if (resolvingIds.has(id)) {
      return void 0;
    }
    resolvingIds.add(id);
    const parentId = parentById.get(id);
    let board = singleBoard;
    if (parentId) {
      board = resolveBoard(parentId);
    }
    resolvingIds.delete(id);
    boardOwnerMap.set(id, board);
    return board;
  }
  for (const id of parentById.keys()) {
    resolveBoard(id);
  }
  return boardOwnerMap;
}

// lib/get-schematic-element-bounds.ts
var SCHEMATIC_TRACE_WIDTH = 0.1;
var SCHEMATIC_NET_LABEL_FONT_SIZE = 0.18;
var SCHEMATIC_NET_LABEL_HEIGHT = 0.2;
var createBounds = ({
  minX,
  minY,
  maxX,
  maxY
}) => {
  const width = maxX - minX;
  const height = maxY - minY;
  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    center: {
      x: minX + width / 2,
      y: minY + height / 2
    }
  };
};
var getSchematicNetLabelTextWidth = (text) => {
  const characterWidth = 0.12 * (SCHEMATIC_NET_LABEL_FONT_SIZE / 0.18);
  const horizontalPadding = 0.12 * (SCHEMATIC_NET_LABEL_FONT_SIZE / 0.18);
  return text.length * characterWidth + horizontalPadding;
};
var getSchematicNetLabelBounds = (netLabel) => {
  const labelLength = getSchematicNetLabelTextWidth(netLabel.text);
  const anchor = netLabel.anchor_position;
  if (!anchor) {
    const isVertical = netLabel.anchor_side === "top" || netLabel.anchor_side === "bottom";
    const width = isVertical ? SCHEMATIC_NET_LABEL_HEIGHT : labelLength;
    const height = isVertical ? labelLength : SCHEMATIC_NET_LABEL_HEIGHT;
    return createBounds({
      minX: netLabel.center.x - width / 2,
      minY: netLabel.center.y - height / 2,
      maxX: netLabel.center.x + width / 2,
      maxY: netLabel.center.y + height / 2
    });
  }
  switch (netLabel.anchor_side) {
    case "left":
      return createBounds({
        minX: anchor.x,
        minY: anchor.y - SCHEMATIC_NET_LABEL_HEIGHT / 2,
        maxX: anchor.x + labelLength,
        maxY: anchor.y + SCHEMATIC_NET_LABEL_HEIGHT / 2
      });
    case "right":
      return createBounds({
        minX: anchor.x - labelLength,
        minY: anchor.y - SCHEMATIC_NET_LABEL_HEIGHT / 2,
        maxX: anchor.x,
        maxY: anchor.y + SCHEMATIC_NET_LABEL_HEIGHT / 2
      });
    case "top":
      return createBounds({
        minX: anchor.x - SCHEMATIC_NET_LABEL_HEIGHT / 2,
        minY: anchor.y - labelLength,
        maxX: anchor.x + SCHEMATIC_NET_LABEL_HEIGHT / 2,
        maxY: anchor.y
      });
    case "bottom":
      return createBounds({
        minX: anchor.x - SCHEMATIC_NET_LABEL_HEIGHT / 2,
        minY: anchor.y,
        maxX: anchor.x + SCHEMATIC_NET_LABEL_HEIGHT / 2,
        maxY: anchor.y + labelLength
      });
  }
};
var getSchematicElementBounds = (element) => {
  if (element.type === "schematic_component") {
    return createBounds({
      minX: element.center.x - element.size.width / 2,
      minY: element.center.y - element.size.height / 2,
      maxX: element.center.x + element.size.width / 2,
      maxY: element.center.y + element.size.height / 2
    });
  }
  if (element.type === "schematic_net_label") {
    return getSchematicNetLabelBounds(element);
  }
  const points = [
    ...element.edges.flatMap((edge) => [edge.from, edge.to]),
    ...element.junctions
  ];
  if (points.length === 0) return null;
  const halfTraceWidth = SCHEMATIC_TRACE_WIDTH / 2;
  return createBounds({
    minX: Math.min(...points.map((point) => point.x)) - halfTraceWidth,
    minY: Math.min(...points.map((point) => point.y)) - halfTraceWidth,
    maxX: Math.max(...points.map((point) => point.x)) + halfTraceWidth,
    maxY: Math.max(...points.map((point) => point.y)) + halfTraceWidth
  });
};

// lib/utils/string-hash.ts
function stringHash(str) {
  let hash = 0;
  if (str.length == 0) return hash;
  for (var i = 0; i < str.length; i++) {
    var char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// lib/utils/get-layout-debug-object.ts
var nice_color_palettes = [
  ["#69d2e7", "#a7dbd8", "#e0e4cc", "#f38630", "#fa6900"],
  ["#fe4365", "#fc9d9a", "#f9cdad", "#c8c8a9", "#83af9b"],
  ["#ecd078", "#d95b43", "#c02942", "#542437", "#53777a"],
  ["#556270", "#4ecdc4", "#c7f464", "#ff6b6b", "#c44d58"],
  ["#774f38", "#e08e79", "#f1d4af", "#ece5ce", "#c5e0dc"],
  ["#e8ddcb", "#cdb380", "#036564", "#033649", "#031634"],
  ["#490a3d", "#bd1550", "#e97f02", "#f8ca00", "#8a9b0f"],
  ["#594f4f", "#547980", "#45ada8", "#9de0ad", "#e5fcc2"],
  ["#00a0b0", "#6a4a3c", "#cc333f", "#eb6841", "#edc951"],
  ["#e94e77", "#d68189", "#c6a49a", "#c6e5d9", "#f4ead5"],
  ["#3fb8af", "#7fc7af", "#dad8a7", "#ff9e9d", "#ff3d7f"],
  ["#d9ceb2", "#948c75", "#d5ded9", "#7a6a53", "#99b2b7"],
  ["#ffffff", "#cbe86b", "#f2e9e1", "#1c140d", "#cbe86b"],
  ["#efffcd", "#dce9be", "#555152", "#2e2633", "#99173c"],
  ["#343838", "#005f6b", "#008c9e", "#00b4cc", "#00dffc"],
  ["#413e4a", "#73626e", "#b38184", "#f0b49e", "#f7e4be"],
  ["#ff4e50", "#fc913a", "#f9d423", "#ede574", "#e1f5c4"],
  ["#99b898", "#fecea8", "#ff847c", "#e84a5f", "#2a363b"],
  ["#655643", "#80bca3", "#f6f7bd", "#e6ac27", "#bf4d28"],
  ["#00a8c6", "#40c0cb", "#f9f2e7", "#aee239", "#8fbe00"],
  ["#351330", "#424254", "#64908a", "#e8caa4", "#cc2a41"],
  ["#554236", "#f77825", "#d3ce3d", "#f1efa5", "#60b99a"],
  ["#5d4157", "#838689", "#a8caba", "#cad7b2", "#ebe3aa"],
  ["#8c2318", "#5e8c6a", "#88a65e", "#bfb35a", "#f2c45a"],
  ["#fad089", "#ff9c5b", "#f5634a", "#ed303c", "#3b8183"],
  ["#ff4242", "#f4fad2", "#d4ee5e", "#e1edb9", "#f0f2eb"],
  ["#f8b195", "#f67280", "#c06c84", "#6c5b7b", "#355c7d"],
  ["#d1e751", "#ffffff", "#000000", "#4dbce9", "#26ade4"],
  ["#1b676b", "#519548", "#88c425", "#bef202", "#eafde6"],
  ["#5e412f", "#fcebb6", "#78c0a8", "#f07818", "#f0a830"],
  ["#bcbdac", "#cfbe27", "#f27435", "#f02475", "#3b2d38"],
  ["#452632", "#91204d", "#e4844a", "#e8bf56", "#e2f7ce"],
  ["#eee6ab", "#c5bc8e", "#696758", "#45484b", "#36393b"],
  ["#f0d8a8", "#3d1c00", "#86b8b1", "#f2d694", "#fa2a00"],
  ["#2a044a", "#0b2e59", "#0d6759", "#7ab317", "#a0c55f"],
  ["#f04155", "#ff823a", "#f2f26f", "#fff7bd", "#95cfb7"],
  ["#b9d7d9", "#668284", "#2a2829", "#493736", "#7b3b3b"],
  ["#bbbb88", "#ccc68d", "#eedd99", "#eec290", "#eeaa88"],
  ["#b3cc57", "#ecf081", "#ffbe40", "#ef746f", "#ab3e5b"],
  ["#a3a948", "#edb92e", "#f85931", "#ce1836", "#009989"],
  ["#300030", "#480048", "#601848", "#c04848", "#f07241"],
  ["#67917a", "#170409", "#b8af03", "#ccbf82", "#e33258"],
  ["#aab3ab", "#c4cbb7", "#ebefc9", "#eee0b7", "#e8caaf"],
  ["#e8d5b7", "#0e2430", "#fc3a51", "#f5b349", "#e8d5b9"],
  ["#ab526b", "#bca297", "#c5ceae", "#f0e2a4", "#f4ebc3"],
  ["#607848", "#789048", "#c0d860", "#f0f0d8", "#604848"],
  ["#b6d8c0", "#c8d9bf", "#dadabd", "#ecdbbc", "#fedcba"],
  ["#a8e6ce", "#dcedc2", "#ffd3b5", "#ffaaa6", "#ff8c94"],
  ["#3e4147", "#fffedf", "#dfba69", "#5a2e2e", "#2a2c31"],
  ["#fc354c", "#29221f", "#13747d", "#0abfbc", "#fcf7c5"],
  ["#cc0c39", "#e6781e", "#c8cf02", "#f8fcc1", "#1693a7"],
  ["#1c2130", "#028f76", "#b3e099", "#ffeaad", "#d14334"],
  ["#a7c5bd", "#e5ddcb", "#eb7b59", "#cf4647", "#524656"],
  ["#dad6ca", "#1bb0ce", "#4f8699", "#6a5e72", "#563444"],
  ["#5c323e", "#a82743", "#e15e32", "#c0d23e", "#e5f04c"],
  ["#edebe6", "#d6e1c7", "#94c7b6", "#403b33", "#d3643b"],
  ["#fdf1cc", "#c6d6b8", "#987f69", "#e3ad40", "#fcd036"],
  ["#230f2b", "#f21d41", "#ebebbc", "#bce3c5", "#82b3ae"],
  ["#b9d3b0", "#81bda4", "#b28774", "#f88f79", "#f6aa93"],
  ["#3a111c", "#574951", "#83988e", "#bcdea5", "#e6f9bc"],
  ["#5e3929", "#cd8c52", "#b7d1a3", "#dee8be", "#fcf7d3"],
  ["#1c0113", "#6b0103", "#a30006", "#c21a01", "#f03c02"],
  ["#000000", "#9f111b", "#b11623", "#292c37", "#cccccc"],
  ["#382f32", "#ffeaf2", "#fcd9e5", "#fbc5d8", "#f1396d"],
  ["#e3dfba", "#c8d6bf", "#93ccc6", "#6cbdb5", "#1a1f1e"],
  ["#f6f6f6", "#e8e8e8", "#333333", "#990100", "#b90504"],
  ["#1b325f", "#9cc4e4", "#e9f2f9", "#3a89c9", "#f26c4f"],
  ["#a1dbb2", "#fee5ad", "#faca66", "#f7a541", "#f45d4c"],
  ["#c1b398", "#605951", "#fbeec2", "#61a6ab", "#accec0"],
  ["#5e9fa3", "#dcd1b4", "#fab87f", "#f87e7b", "#b05574"],
  ["#951f2b", "#f5f4d7", "#e0dfb1", "#a5a36c", "#535233"],
  ["#8dccad", "#988864", "#fea6a2", "#f9d6ac", "#ffe9af"],
  ["#2d2d29", "#215a6d", "#3ca2a2", "#92c7a3", "#dfece6"],
  ["#413d3d", "#040004", "#c8ff00", "#fa023c", "#4b000f"],
  ["#eff3cd", "#b2d5ba", "#61ada0", "#248f8d", "#605063"],
  ["#ffefd3", "#fffee4", "#d0ecea", "#9fd6d2", "#8b7a5e"],
  ["#cfffdd", "#b4dec1", "#5c5863", "#a85163", "#ff1f4c"],
  ["#9dc9ac", "#fffec7", "#f56218", "#ff9d2e", "#919167"],
  ["#4e395d", "#827085", "#8ebe94", "#ccfc8e", "#dc5b3e"],
  ["#a8a7a7", "#cc527a", "#e8175d", "#474747", "#363636"],
  ["#f8edd1", "#d88a8a", "#474843", "#9d9d93", "#c5cfc6"],
  ["#046d8b", "#309292", "#2fb8ac", "#93a42a", "#ecbe13"],
  ["#f38a8a", "#55443d", "#a0cab5", "#cde9ca", "#f1edd0"],
  ["#a70267", "#f10c49", "#fb6b41", "#f6d86b", "#339194"],
  ["#ff003c", "#ff8a00", "#fabe28", "#88c100", "#00c176"],
  ["#ffedbf", "#f7803c", "#f54828", "#2e0d23", "#f8e4c1"],
  ["#4e4d4a", "#353432", "#94ba65", "#2790b0", "#2b4e72"],
  ["#0ca5b0", "#4e3f30", "#fefeeb", "#f8f4e4", "#a5b3aa"],
  ["#4d3b3b", "#de6262", "#ffb88c", "#ffd0b3", "#f5e0d3"],
  ["#fffbb7", "#a6f6af", "#66b6ab", "#5b7c8d", "#4f2958"],
  ["#edf6ee", "#d1c089", "#b3204d", "#412e28", "#151101"],
  ["#9d7e79", "#ccac95", "#9a947c", "#748b83", "#5b756c"],
  ["#fcfef5", "#e9ffe1", "#cdcfb7", "#d6e6c3", "#fafbe3"],
  ["#9cddc8", "#bfd8ad", "#ddd9ab", "#f7af63", "#633d2e"],
  ["#30261c", "#403831", "#36544f", "#1f5f61", "#0b8185"],
  ["#aaff00", "#ffaa00", "#ff00aa", "#aa00ff", "#00aaff"],
  ["#d1313d", "#e5625c", "#f9bf76", "#8eb2c5", "#615375"],
  ["#ffe181", "#eee9e5", "#fad3b2", "#ffba7f", "#ff9c97"],
  ["#73c8a9", "#dee1b6", "#e1b866", "#bd5532", "#373b44"],
  ["#805841", "#dcf7f3", "#fffcdd", "#ffd8d8", "#f5a2a2"]
];
var getDebugLayoutObject = (lo) => {
  let {
    x,
    y,
    width,
    height
  } = {
    ...lo,
    ...lo.size,
    ...lo.center,
    ...lo.position
  };
  if (lo.x1 !== void 0 && lo.x2 !== void 0 && lo.y1 !== void 0 && lo.y2 !== void 0) {
    x = (lo.x1 + lo.x2) / 2;
    y = (lo.y1 + lo.y2) / 2;
    width = Math.abs(lo.x1 - lo.x2);
    height = Math.abs(lo.y1 - lo.y2);
  }
  if (lo.points && Array.isArray(lo.points) && lo.points.length > 0) {
    const xCoords = lo.points.map((point) => point.x);
    const yCoords = lo.points.map((point) => point.y);
    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minY = Math.min(...yCoords);
    const maxY = Math.max(...yCoords);
    x = (minX + maxX) / 2;
    y = (minY + maxY) / 2;
    width = maxX - minX;
    height = maxY - minY;
  }
  const title = lo.text || lo.name || lo.source?.text || lo.source?.name || "?";
  const content = lo;
  if (x === void 0 || y === void 0) return null;
  if (width === void 0) {
    if ("radius" in lo) {
      width = lo.radius * 2;
      height = lo.radius * 2;
    } else if ("outer_diameter" in lo) {
      width = lo.outer_diameter;
      height = lo.outer_diameter;
    } else if ("rect_pad_width" in lo && "rect_pad_height" in lo) {
      width = lo.rect_pad_width;
      height = lo.rect_pad_height;
      if ("hole_diameter" in lo) {
        width = Math.max(width, lo.hole_diameter);
        height = Math.max(height, lo.hole_diameter);
      }
    } else if ("hole_diameter" in lo) {
      width = lo.hole_diameter;
      height = lo.hole_diameter;
    }
  }
  if (width === void 0 || height === void 0) {
    width = 0.1;
    height = 0.1;
  }
  return {
    x,
    y,
    width,
    height,
    title,
    content,
    bg_color: nice_color_palettes[stringHash(lo.type || title) % nice_color_palettes.length]?.[4] ?? "#f00"
  };
};

// lib/utils/is-truthy.ts
var isTruthy = (value) => Boolean(value);

// lib/find-bounds-and-center.ts
var findBoundsAndCenter = (elements) => {
  const debugObjects = elements.filter(
    (elm) => elm.type.startsWith("pcb_") || elm.type.startsWith("schematic_")
  ).concat(
    elements.filter(
      (elm) => elm.type === "pcb_trace" || elm.type === "schematic_trace"
    ).flatMap((elm) => elm.route)
  ).map((elm) => getDebugLayoutObject(elm)).filter(isTruthy);
  if (debugObjects.length === 0)
    return { center: { x: 0, y: 0 }, width: 0, height: 0 };
  let minX = debugObjects[0].x - debugObjects[0].width / 2;
  let maxX = debugObjects[0].x + debugObjects[0].width / 2;
  let minY = debugObjects[0].y - debugObjects[0].height / 2;
  let maxY = debugObjects[0].y + debugObjects[0].height / 2;
  for (const obj of debugObjects.slice(1)) {
    minX = Math.min(minX, obj.x - obj.width / 2);
    maxX = Math.max(maxX, obj.x + obj.width / 2);
    minY = Math.min(minY, obj.y - obj.height / 2);
    maxY = Math.max(maxY, obj.y + obj.height / 2);
  }
  const width = maxX - minX;
  const height = maxY - minY;
  const center = { x: minX + width / 2, y: minY + height / 2 };
  return { center, width, height };
};

// lib/get-primary-id.ts
var getPrimaryId = (element) => {
  return element[`${element.type}_id`];
};

// lib/reposition-pcb-component.ts
import { translate } from "transformation-matrix";
var repositionPcbComponentTo = (circuitJson, pcb_component_id, newCenter) => {
  const pcbComponent = circuitJson.find(
    (e) => e.type === "pcb_component" && e.pcb_component_id === pcb_component_id
  );
  if (!pcbComponent) return;
  const currentCenter = "center" in pcbComponent ? pcbComponent.center : { x: pcbComponent.x, y: pcbComponent.y };
  const dx = newCenter.x - currentCenter.x;
  const dy = newCenter.y - currentCenter.y;
  const portIds = circuitJson.filter(
    (e) => e.type === "pcb_port" && e.pcb_component_id === pcb_component_id
  ).map((e) => e.pcb_port_id);
  const elementsToMove = circuitJson.filter((elm) => {
    if (elm === pcbComponent) return true;
    const anyElm = elm;
    if (anyElm.pcb_component_id === pcb_component_id) return true;
    if (Array.isArray(anyElm.pcb_component_ids) && anyElm.pcb_component_ids.includes(pcb_component_id))
      return true;
    if (anyElm.pcb_port_id && portIds.includes(anyElm.pcb_port_id)) return true;
    if (Array.isArray(anyElm.pcb_port_ids) && anyElm.pcb_port_ids.some((id) => portIds.includes(id)))
      return true;
    if (anyElm.start_pcb_port_id && portIds.includes(anyElm.start_pcb_port_id))
      return true;
    if (anyElm.end_pcb_port_id && portIds.includes(anyElm.end_pcb_port_id))
      return true;
    if (Array.isArray(anyElm.route) && anyElm.route.some(
      (pt) => pt.start_pcb_port_id && portIds.includes(pt.start_pcb_port_id) || pt.end_pcb_port_id && portIds.includes(pt.end_pcb_port_id)
    ))
      return true;
    return false;
  });
  const matrix = translate(dx, dy);
  transformPCBElements(elementsToMove, matrix);
};

// lib/reposition-pcb-group.ts
import { translate as translate2 } from "transformation-matrix";
var findAllDescendantGroupIds = (circuitJson, parentGroupId) => {
  const childGroupIds = [];
  const directChildren = circuitJson.filter(
    (elm) => elm.type === "source_group" && elm.parent_source_group_id === parentGroupId
  ).map((elm) => elm.source_group_id);
  childGroupIds.push(...directChildren);
  for (const childId of directChildren) {
    childGroupIds.push(...findAllDescendantGroupIds(circuitJson, childId));
  }
  return childGroupIds;
};
var repositionPcbGroupTo = (circuitJson, source_group_id, newCenter) => {
  const allGroupIds = [
    source_group_id,
    ...findAllDescendantGroupIds(circuitJson, source_group_id)
  ];
  const allGroupElements = /* @__PURE__ */ new Set();
  for (const groupId of allGroupIds) {
    const groupElements = buildSubtree(circuitJson, {
      source_group_id: groupId
    });
    groupElements.forEach((elm) => allGroupElements.add(elm));
  }
  const portIds = Array.from(allGroupElements).filter((e) => e.type === "pcb_port").map((e) => e.pcb_port_id);
  const additionalTraces = circuitJson.filter((elm) => {
    if (elm.type !== "pcb_trace") return false;
    if (allGroupElements.has(elm)) return false;
    const anyElm = elm;
    if (anyElm.start_pcb_port_id && portIds.includes(anyElm.start_pcb_port_id))
      return true;
    if (anyElm.end_pcb_port_id && portIds.includes(anyElm.end_pcb_port_id))
      return true;
    if (Array.isArray(anyElm.route) && anyElm.route.some(
      (pt) => pt.start_pcb_port_id && portIds.includes(pt.start_pcb_port_id) || pt.end_pcb_port_id && portIds.includes(pt.end_pcb_port_id)
    ))
      return true;
    return false;
  });
  additionalTraces.forEach((trace) => allGroupElements.add(trace));
  const pcbElements = Array.from(allGroupElements).filter(
    (elm) => elm.type.startsWith("pcb_")
  );
  if (pcbElements.length === 0) return;
  const { center: currentCenter } = findBoundsAndCenter(pcbElements);
  const dx = newCenter.x - currentCenter.x;
  const dy = newCenter.y - currentCenter.y;
  const matrix = translate2(dx, dy);
  transformPCBElements(pcbElements, matrix);
};

// lib/reposition-schematic-component.ts
import { translate as translate3 } from "transformation-matrix";
var repositionSchematicComponentTo = (circuitJson, schematic_component_id, newCenter) => {
  const schematicComponent = circuitJson.find(
    (e) => e.type === "schematic_component" && e.schematic_component_id === schematic_component_id
  );
  if (!schematicComponent) return;
  const currentCenter = "center" in schematicComponent ? schematicComponent.center : { x: schematicComponent.x, y: schematicComponent.y };
  const dx = newCenter.x - currentCenter.x;
  const dy = newCenter.y - currentCenter.y;
  const portIds = circuitJson.filter(
    (e) => e.type === "schematic_port" && e.schematic_component_id === schematic_component_id
  ).map((e) => e.schematic_port_id);
  const elementsToMove = circuitJson.filter((elm) => {
    if (elm === schematicComponent) return true;
    const anyElm = elm;
    if (anyElm.schematic_component_id === schematic_component_id) return true;
    if (Array.isArray(anyElm.schematic_component_ids) && anyElm.schematic_component_ids.includes(schematic_component_id))
      return true;
    if (anyElm.schematic_port_id && portIds.includes(anyElm.schematic_port_id))
      return true;
    if (Array.isArray(anyElm.schematic_port_ids) && anyElm.schematic_port_ids.some((id) => portIds.includes(id)))
      return true;
    if (anyElm.start_schematic_port_id && portIds.includes(anyElm.start_schematic_port_id))
      return true;
    if (anyElm.end_schematic_port_id && portIds.includes(anyElm.end_schematic_port_id))
      return true;
    if (Array.isArray(anyElm.route) && anyElm.route.some(
      (pt) => pt.start_schematic_port_id && portIds.includes(pt.start_schematic_port_id) || pt.end_schematic_port_id && portIds.includes(pt.end_schematic_port_id)
    ))
      return true;
    return false;
  });
  const matrix = translate3(dx, dy);
  transformSchematicElements(elementsToMove, matrix);
};

// lib/reposition-schematic-group.ts
import { translate as translate4 } from "transformation-matrix";
var findAllDescendantGroupIds2 = (circuitJson, parentGroupId) => {
  const childGroupIds = [];
  const directChildren = circuitJson.filter(
    (elm) => elm.type === "source_group" && elm.parent_source_group_id === parentGroupId
  ).map((elm) => elm.source_group_id);
  childGroupIds.push(...directChildren);
  for (const childId of directChildren) {
    childGroupIds.push(...findAllDescendantGroupIds2(circuitJson, childId));
  }
  return childGroupIds;
};
var repositionSchematicGroupTo = (circuitJson, source_group_id, newCenter) => {
  const allGroupIds = [
    source_group_id,
    ...findAllDescendantGroupIds2(circuitJson, source_group_id)
  ];
  const allGroupElements = /* @__PURE__ */ new Set();
  for (const groupId of allGroupIds) {
    const groupElements = buildSubtree(circuitJson, {
      source_group_id: groupId
    });
    groupElements.forEach((elm) => allGroupElements.add(elm));
  }
  const portIds = Array.from(allGroupElements).filter((e) => e.type === "schematic_port").map((e) => e.schematic_port_id);
  const additionalTraces = circuitJson.filter((elm) => {
    if (elm.type !== "schematic_trace") return false;
    if (allGroupElements.has(elm)) return false;
    const anyElm = elm;
    if (anyElm.start_schematic_port_id && portIds.includes(anyElm.start_schematic_port_id))
      return true;
    if (anyElm.end_schematic_port_id && portIds.includes(anyElm.end_schematic_port_id))
      return true;
    if (Array.isArray(anyElm.route) && anyElm.route.some(
      (pt) => pt.start_schematic_port_id && portIds.includes(pt.start_schematic_port_id) || pt.end_schematic_port_id && portIds.includes(pt.end_schematic_port_id)
    ))
      return true;
    return false;
  });
  additionalTraces.forEach((trace) => allGroupElements.add(trace));
  const schematicElements = Array.from(allGroupElements).filter(
    (elm) => elm.type.startsWith("schematic_")
  );
  if (schematicElements.length === 0) return;
  const { center: currentCenter } = findBoundsAndCenter(schematicElements);
  const dx = newCenter.x - currentCenter.x;
  const dy = newCenter.y - currentCenter.y;
  const matrix = translate4(dx, dy);
  transformSchematicElements(schematicElements, matrix);
};

// lib/getCircuitJsonTree.ts
var getCircuitJsonTree = (circuitJson, opts) => {
  const groupChildMap = /* @__PURE__ */ new Map();
  const existingGroupIds = /* @__PURE__ */ new Set();
  for (const elm of circuitJson) {
    if (elm.type === "source_group") {
      existingGroupIds.add(elm.source_group_id);
    }
  }
  const orphanedGroups = [];
  for (const elm of circuitJson) {
    if (elm.type === "source_group" && elm.parent_source_group_id) {
      const parentId = elm.parent_source_group_id;
      const childId = elm.source_group_id;
      if (!existingGroupIds.has(parentId)) {
        orphanedGroups.push(childId);
        if (!groupChildMap.has(childId)) {
          groupChildMap.set(childId, []);
        }
      } else {
        const children = groupChildMap.get(parentId) ?? [];
        children.push(childId);
        groupChildMap.set(parentId, children);
        if (!groupChildMap.has(childId)) {
          groupChildMap.set(childId, []);
        }
      }
    }
  }
  for (const elm of circuitJson) {
    if (elm.type === "source_group" && !groupChildMap.has(elm.source_group_id)) {
      groupChildMap.set(elm.source_group_id, []);
    }
  }
  const groupNodes = /* @__PURE__ */ new Map();
  const getNextGroupId = () => {
    for (const [parentId, children] of groupChildMap) {
      if (groupNodes.has(parentId)) continue;
      if (children.every((childId) => groupNodes.has(childId))) {
        return parentId;
      }
    }
    return null;
  };
  let lastGroupId = null;
  while (true) {
    const nextGroupId = getNextGroupId();
    if (!nextGroupId) break;
    const sourceGroup = circuitJson.find(
      (elm) => elm.type === "source_group" && elm.source_group_id === nextGroupId
    );
    const node = {
      nodeType: "group",
      sourceGroup,
      otherChildElements: [],
      childNodes: [
        ...groupChildMap.get(nextGroupId)?.map((childId) => groupNodes.get(childId)) ?? [],
        ...circuitJson.filter(
          (elm) => elm.type === "source_component" && elm.source_group_id === nextGroupId
        ).map((elm) => {
          return {
            nodeType: "component",
            sourceComponent: elm,
            childNodes: [],
            otherChildElements: [
              ...circuitJson.filter(
                (e) => e.type === "pcb_component" && e.source_component_id === elm.source_component_id
              )
            ]
            // TODO populate
          };
        })
      ]
    };
    groupNodes.set(nextGroupId, node);
    lastGroupId = nextGroupId;
  }
  if (!lastGroupId) {
    console.warn("No groups were processed, returning tree without sourceGroup");
    return {
      nodeType: "group",
      childNodes: [],
      // TODO populate
      otherChildElements: circuitJson
    };
  }
  let rootGroupId = null;
  if (opts && opts.source_group_id !== void 0) {
    rootGroupId = opts.source_group_id;
  } else if (orphanedGroups.length > 0) {
    rootGroupId = orphanedGroups[0];
  } else {
    rootGroupId = lastGroupId;
  }
  if (!rootGroupId) {
    console.warn(
      "No valid root group found, returning tree without sourceGroup"
    );
    return {
      nodeType: "group",
      childNodes: [],
      otherChildElements: circuitJson
    };
  }
  return groupNodes.get(rootGroupId);
};

// lib/getStringFromCircuitJsonTree.ts
var getStringFromCircuitJsonTree = (circuitJsonTree, indent = 0) => {
  if (circuitJsonTree.nodeType === "component") {
    return `${" ".repeat(indent)}${circuitJsonTree.sourceComponent?.name ?? circuitJsonTree.sourceComponent?.source_component_id}`;
  }
  const lines = [];
  lines.push(
    `${" ".repeat(indent)}${circuitJsonTree.sourceGroup?.name ?? circuitJsonTree.sourceGroup?.source_group_id}`
  );
  for (const child of circuitJsonTree.childNodes) {
    lines.push(getStringFromCircuitJsonTree(child, indent + 2));
  }
  return lines.join("\n");
};

// lib/get-minimum-flex-container.ts
function getMinimumFlexContainer(children, options = {}) {
  if (children.length === 0) return { width: 0, height: 0 };
  const direction = options.direction ?? "row";
  const columnGap = options.columnGap ?? 0;
  const rowGap = options.rowGap ?? 0;
  const isRowDirection = direction === "row" || direction === "row-reverse";
  if (isRowDirection) {
    const totalChildWidth = children.reduce((sum, c) => sum + c.width, 0);
    const width = totalChildWidth + columnGap * Math.max(0, children.length - 1);
    const height = children.reduce((max, c) => Math.max(max, c.height), 0);
    return { width, height };
  } else {
    const totalChildHeight = children.reduce((sum, c) => sum + c.height, 0);
    const height = totalChildHeight + rowGap * Math.max(0, children.length - 1);
    const width = children.reduce((max, c) => Math.max(max, c.width), 0);
    return { width, height };
  }
}

// lib/get-element-render-layers.ts
function getElementRenderLayers(element) {
  if (element.type === "pcb_smtpad") {
    const layer = element.layer;
    return [`${layer}_copper`];
  }
  if (element.type === "pcb_trace") {
    if (!element.route || !Array.isArray(element.route)) return [];
    const layers = /* @__PURE__ */ new Set();
    for (const point of element.route) {
      if ("layer" in point && point.layer) {
        layers.add(`${point.layer}_copper`);
      }
    }
    return Array.from(layers);
  }
  if (element.type === "pcb_copper_pour") {
    const layer = element.layer;
    return [`${layer}_copper`];
  }
  if (element.type === "pcb_copper_text") {
    const layer = element.layer;
    return [`${layer}_copper`];
  }
  if (element.type === "pcb_silkscreen_text" || element.type === "pcb_silkscreen_rect" || element.type === "pcb_silkscreen_circle" || element.type === "pcb_silkscreen_line" || element.type === "pcb_silkscreen_path") {
    const layer = element.layer;
    return [`${layer}_silkscreen`];
  }
  if (element.type === "pcb_fabrication_note_text" || element.type === "pcb_fabrication_note_rect" || element.type === "pcb_fabrication_note_path") {
    const layer = element.layer;
    return [`${layer}_fabrication_note`];
  }
  if (element.type === "pcb_courtyard_circle" || element.type === "pcb_courtyard_polygon" || element.type === "pcb_courtyard_rect" || element.type === "pcb_courtyard_outline") {
    const layer = element.layer;
    return [`${layer}_courtyard`];
  }
  if (element.type === "pcb_note_rect" || element.type === "pcb_note_path" || element.type === "pcb_note_text" || element.type === "pcb_note_line" || element.type === "pcb_note_dimension") {
    const layer = element.layer;
    return [`${layer}_user_note`];
  }
  return [];
}

// lib/shape-distances/geometry.ts
var EPSILON = 1e-9;
var toRadians = (degrees) => degrees * Math.PI / 180;
var clamp = (value, min, max) => Math.max(min, Math.min(max, value));
var distanceBetweenPoints = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
var distanceBetweenPointAndSegment = (point, a, b) => {
  const abX = b.x - a.x;
  const abY = b.y - a.y;
  const lengthSquared = abX * abX + abY * abY;
  if (lengthSquared <= EPSILON) return distanceBetweenPoints(point, a);
  const t = clamp(
    ((point.x - a.x) * abX + (point.y - a.y) * abY) / lengthSquared,
    0,
    1
  );
  return Math.hypot(point.x - (a.x + t * abX), point.y - (a.y + t * abY));
};
var cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
var isPointOnSegment = (point, a, b) => {
  if (Math.abs(cross(a, b, point)) > EPSILON) return false;
  return point.x >= Math.min(a.x, b.x) - EPSILON && point.x <= Math.max(a.x, b.x) + EPSILON && point.y >= Math.min(a.y, b.y) - EPSILON && point.y <= Math.max(a.y, b.y) + EPSILON;
};
var segmentsIntersect = (a1, a2, b1, b2) => {
  const c1 = cross(a1, a2, b1);
  const c2 = cross(a1, a2, b2);
  const c3 = cross(b1, b2, a1);
  const c4 = cross(b1, b2, a2);
  if ((c1 > EPSILON && c2 < -EPSILON || c1 < -EPSILON && c2 > EPSILON) && (c3 > EPSILON && c4 < -EPSILON || c3 < -EPSILON && c4 > EPSILON)) {
    return true;
  }
  return isPointOnSegment(b1, a1, a2) || isPointOnSegment(b2, a1, a2) || isPointOnSegment(a1, b1, b2) || isPointOnSegment(a2, b1, b2);
};
var getPolygonEdges = (polygon) => {
  const edges = [];
  if (polygon.points.length < 2) return edges;
  for (let i = 0; i < polygon.points.length; i += 1) {
    const a = polygon.points[i];
    const b = polygon.points[(i + 1) % polygon.points.length];
    if (!a || !b) continue;
    edges.push([a, b]);
  }
  return edges;
};
var isPointInPolygon = (point, polygon) => {
  for (const [a, b] of getPolygonEdges(polygon)) {
    if (isPointOnSegment(point, a, b)) return true;
  }
  let inside = false;
  for (let i = 0, j = polygon.points.length - 1; i < polygon.points.length; j = i++) {
    const pi = polygon.points[i];
    const pj = polygon.points[j];
    if (!pi || !pj) continue;
    const intersects = pi.y > point.y !== pj.y > point.y && point.x < (pj.x - pi.x) * (point.y - pi.y) / (pj.y - pi.y) + pi.x;
    if (intersects) inside = !inside;
  }
  return inside;
};
var rotatePoint = (point, angleRadians) => ({
  x: point.x * Math.cos(angleRadians) - point.y * Math.sin(angleRadians),
  y: point.x * Math.sin(angleRadians) + point.y * Math.cos(angleRadians)
});
var rectToPolygon = (rect) => {
  const halfWidth = rect.width / 2;
  const halfHeight = rect.height / 2;
  const angle = toRadians(rect.rotationDegrees);
  return {
    kind: "polygon",
    points: [
      { x: -halfWidth, y: -halfHeight },
      { x: halfWidth, y: -halfHeight },
      { x: halfWidth, y: halfHeight },
      { x: -halfWidth, y: halfHeight }
    ].map((localPoint) => {
      const rotated = rotatePoint(localPoint, angle);
      return { x: rect.centerX + rotated.x, y: rect.centerY + rotated.y };
    })
  };
};

// lib/shape-distances/decompose-copper-into-shapes.ts
var isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);
var createWireSegmentRect = (start, end, width) => ({
  kind: "rect",
  centerX: (start.x + end.x) / 2,
  centerY: (start.y + end.y) / 2,
  width: Math.hypot(end.x - start.x, end.y - start.y),
  height: width,
  rotationDegrees: Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI
});
var decomposeCopperIntoShapes = (element) => {
  const elm = element;
  const shapes = [];
  if (elm.type === "pcb_smtpad") {
    if (elm.shape === "circle" && isFiniteNumber(elm.radius)) {
      shapes.push({ kind: "circle", x: elm.x, y: elm.y, radius: elm.radius });
    }
    if (elm.shape === "rect" && isFiniteNumber(elm.width) && isFiniteNumber(elm.height)) {
      shapes.push({
        kind: "rect",
        centerX: elm.x,
        centerY: elm.y,
        width: elm.width,
        height: elm.height,
        rotationDegrees: isFiniteNumber(elm.ccw_rotation) ? elm.ccw_rotation : 0
      });
    }
    if (elm.shape === "polygon" && Array.isArray(elm.points)) {
      const points = elm.points.filter(
        (point) => isFiniteNumber(point?.x) && isFiniteNumber(point?.y)
      );
      if (points.length >= 3) {
        shapes.push({ kind: "polygon", points });
      }
    }
    return shapes;
  }
  if (elm.type === "pcb_trace" && Array.isArray(elm.route)) {
    for (let i = 0; i < elm.route.length - 1; i += 1) {
      const start = elm.route[i];
      const end = elm.route[i + 1];
      if (!start || !end || start.route_type !== "wire" || end.route_type !== "wire" || !isFiniteNumber(start.x) || !isFiniteNumber(start.y) || !isFiniteNumber(end.x) || !isFiniteNumber(end.y)) {
        continue;
      }
      const width = isFiniteNumber(start.width) ? Math.max(0, start.width) : 0;
      const radius = width / 2;
      shapes.push({ kind: "circle", x: start.x, y: start.y, radius });
      shapes.push({ kind: "circle", x: end.x, y: end.y, radius });
      if (Math.hypot(end.x - start.x, end.y - start.y) > EPSILON) {
        shapes.push(createWireSegmentRect(start, end, width));
      }
    }
    return shapes;
  }
  if (elm.type === "pcb_via" && isFiniteNumber(elm.outer_diameter)) {
    shapes.push({
      kind: "circle",
      x: elm.x,
      y: elm.y,
      radius: elm.outer_diameter / 2
    });
    return shapes;
  }
  if (elm.type === "pcb_plated_hole") {
    if (isFiniteNumber(elm.outer_diameter)) {
      shapes.push({
        kind: "circle",
        x: elm.x,
        y: elm.y,
        radius: elm.outer_diameter / 2
      });
    }
    if (isFiniteNumber(elm.rect_pad_width) && isFiniteNumber(elm.rect_pad_height)) {
      shapes.push({
        kind: "rect",
        centerX: elm.x,
        centerY: elm.y,
        width: elm.rect_pad_width,
        height: elm.rect_pad_height,
        rotationDegrees: isFiniteNumber(elm.rect_ccw_rotation) ? elm.rect_ccw_rotation : 0
      });
    }
    if (isFiniteNumber(elm.outer_width) && isFiniteNumber(elm.outer_height)) {
      shapes.push({
        kind: "rect",
        centerX: elm.x,
        centerY: elm.y,
        width: elm.outer_width,
        height: elm.outer_height,
        rotationDegrees: 0
      });
    }
    return shapes;
  }
  return shapes;
};

// lib/shape-distances/distance-between-shapes.ts
var distanceBetweenCircleAndCircle = (a, b) => Math.max(0, Math.hypot(a.x - b.x, a.y - b.y) - a.radius - b.radius);
var distanceBetweenPolygonAndPolygon = (a, b) => {
  if (a.points.length < 3 || b.points.length < 3) {
    return Number.POSITIVE_INFINITY;
  }
  for (const [a1, a2] of getPolygonEdges(a)) {
    for (const [b1, b2] of getPolygonEdges(b)) {
      if (segmentsIntersect(a1, a2, b1, b2)) {
        return 0;
      }
    }
  }
  const aPoint = a.points[0];
  const bPoint = b.points[0];
  if (aPoint && isPointInPolygon(aPoint, b) || bPoint && isPointInPolygon(bPoint, a)) {
    return 0;
  }
  let minDistance = Number.POSITIVE_INFINITY;
  for (const [a1, a2] of getPolygonEdges(a)) {
    for (const [b1, b2] of getPolygonEdges(b)) {
      minDistance = Math.min(
        minDistance,
        distanceBetweenPointAndSegment(a1, b1, b2),
        distanceBetweenPointAndSegment(a2, b1, b2),
        distanceBetweenPointAndSegment(b1, a1, a2),
        distanceBetweenPointAndSegment(b2, a1, a2)
      );
    }
  }
  return minDistance;
};
var distanceBetweenCircleAndPolygon = (circle, polygon) => {
  if (polygon.points.length < 3) {
    return Number.POSITIVE_INFINITY;
  }
  if (isPointInPolygon({ x: circle.x, y: circle.y }, polygon)) {
    return 0;
  }
  let minDistanceToEdge = Number.POSITIVE_INFINITY;
  for (const [start, end] of getPolygonEdges(polygon)) {
    minDistanceToEdge = Math.min(
      minDistanceToEdge,
      distanceBetweenPointAndSegment({ x: circle.x, y: circle.y }, start, end)
    );
  }
  return Math.max(0, minDistanceToEdge - circle.radius);
};
var distanceBetweenShapes = (a, b) => {
  if (a.kind === "circle" && b.kind === "circle") {
    return distanceBetweenCircleAndCircle(a, b);
  }
  if (a.kind === "rect" && b.kind === "rect") {
    return distanceBetweenPolygonAndPolygon(rectToPolygon(a), rectToPolygon(b));
  }
  if (a.kind === "circle" && b.kind === "rect") {
    return distanceBetweenCircleAndPolygon(a, rectToPolygon(b));
  }
  if (a.kind === "rect" && b.kind === "circle") {
    return distanceBetweenCircleAndPolygon(b, rectToPolygon(a));
  }
  if (a.kind === "circle" && b.kind === "polygon") {
    return distanceBetweenCircleAndPolygon(a, b);
  }
  if (a.kind === "polygon" && b.kind === "circle") {
    return distanceBetweenCircleAndPolygon(b, a);
  }
  if (a.kind === "rect" && b.kind === "polygon") {
    return distanceBetweenPolygonAndPolygon(rectToPolygon(a), b);
  }
  if (a.kind === "polygon" && b.kind === "rect") {
    return distanceBetweenPolygonAndPolygon(a, rectToPolygon(b));
  }
  if (a.kind === "polygon" && b.kind === "polygon") {
    return distanceBetweenPolygonAndPolygon(a, b);
  }
  return Number.POSITIVE_INFINITY;
};

// lib/compute-gap-between-copper.ts
var computeGapBetweenCopper = (elm1, elm2) => {
  const shapes1 = decomposeCopperIntoShapes(elm1);
  const shapes2 = decomposeCopperIntoShapes(elm2);
  if (shapes1.length === 0 || shapes2.length === 0) {
    return Number.POSITIVE_INFINITY;
  }
  let minimumGap = Number.POSITIVE_INFINITY;
  for (const shape1 of shapes1) {
    for (const shape2 of shapes2) {
      minimumGap = Math.min(minimumGap, distanceBetweenShapes(shape1, shape2));
    }
  }
  return minimumGap;
};

// lib/shape-distances/decompose-clearance-into-shapes.ts
var isFiniteNumber2 = (value) => typeof value === "number" && Number.isFinite(value);
var getCenter = (elm) => {
  if (isFiniteNumber2(elm?.x) && isFiniteNumber2(elm?.y)) {
    return { x: elm.x, y: elm.y };
  }
  if (isFiniteNumber2(elm?.center?.x) && isFiniteNumber2(elm?.center?.y)) {
    return { x: elm.center.x, y: elm.center.y };
  }
  return null;
};
var addCenterBasedShapes = (elm, shapes) => {
  const center = getCenter(elm);
  if (!center) return;
  if (elm.shape === "circle") {
    if (isFiniteNumber2(elm.radius)) {
      shapes.push({
        kind: "circle",
        x: center.x,
        y: center.y,
        radius: elm.radius
      });
      return;
    }
    if (isFiniteNumber2(elm.diameter)) {
      shapes.push({
        kind: "circle",
        x: center.x,
        y: center.y,
        radius: elm.diameter / 2
      });
      return;
    }
  }
  if (elm.shape === "rect" && isFiniteNumber2(elm.width) && isFiniteNumber2(elm.height)) {
    shapes.push({
      kind: "rect",
      centerX: center.x,
      centerY: center.y,
      width: elm.width,
      height: elm.height,
      rotationDegrees: isFiniteNumber2(elm.ccw_rotation) ? elm.ccw_rotation : 0
    });
    return;
  }
  if (elm.shape === "polygon" && Array.isArray(elm.points)) {
    const points = elm.points.filter(
      (point) => isFiniteNumber2(point?.x) && isFiniteNumber2(point?.y)
    );
    if (points.length >= 3) {
      shapes.push({ kind: "polygon", points });
    }
  }
};
var decomposeClearanceIntoShapes = (element) => {
  const elm = element;
  const shapes = [...decomposeCopperIntoShapes(element)];
  if (elm.type === "pcb_hole" && elm.hole_shape === "circle") {
    if (isFiniteNumber2(elm.hole_diameter) && isFiniteNumber2(elm.x) && isFiniteNumber2(elm.y)) {
      shapes.push({
        kind: "circle",
        x: elm.x,
        y: elm.y,
        radius: elm.hole_diameter / 2
      });
    }
    return shapes;
  }
  if (elm.type === "pcb_plated_hole") {
    if (isFiniteNumber2(elm.hole_diameter) && isFiniteNumber2(elm.x) && isFiniteNumber2(elm.y)) {
      const holeOffsetX = isFiniteNumber2(elm.hole_offset_x) ? elm.hole_offset_x : 0;
      const holeOffsetY = isFiniteNumber2(elm.hole_offset_y) ? elm.hole_offset_y : 0;
      shapes.push({
        kind: "circle",
        x: elm.x + holeOffsetX,
        y: elm.y + holeOffsetY,
        radius: elm.hole_diameter / 2
      });
    }
    return shapes;
  }
  if (elm.type === "pcb_keepout" || elm.type === "pcb_cutout" || elm.type === "pcb_board") {
    addCenterBasedShapes(elm, shapes);
    return shapes;
  }
  return shapes;
};

// lib/compute-clearance-between-elements.ts
var computeClearanceBetweenElements = (elm1, elm2) => {
  const shapes1 = decomposeClearanceIntoShapes(elm1);
  const shapes2 = decomposeClearanceIntoShapes(elm2);
  if (shapes1.length === 0 || shapes2.length === 0) {
    return Number.POSITIVE_INFINITY;
  }
  let minimumGap = Number.POSITIVE_INFINITY;
  for (const shape1 of shapes1) {
    for (const shape2 of shapes2) {
      minimumGap = Math.min(minimumGap, distanceBetweenShapes(shape1, shape2));
    }
  }
  return minimumGap;
};

// lib/analyze-pcb-pin1-location.ts
var PIN1_LOCATION_PARTS = {
  leftside_top: { side: "leftside", alignment: "top" },
  leftside_bottom: { side: "leftside", alignment: "bottom" },
  rightside_top: { side: "rightside", alignment: "top" },
  rightside_bottom: { side: "rightside", alignment: "bottom" },
  topside_left: { side: "topside", alignment: "left" },
  topside_right: { side: "topside", alignment: "right" },
  bottomside_left: { side: "bottomside", alignment: "left" },
  bottomside_right: { side: "bottomside", alignment: "right" }
};
var PIN1_LOCATIONS = Object.keys(PIN1_LOCATION_PARTS);
var getPadCenter = (pad) => {
  if (typeof pad.x === "number" && typeof pad.y === "number") {
    return { x: pad.x, y: pad.y };
  }
  if (pad.points && pad.points.length > 0) {
    const xs = pad.points.map((point) => point.x);
    const ys = pad.points.map((point) => point.y);
    return {
      x: (Math.min(...xs) + Math.max(...xs)) / 2,
      y: (Math.min(...ys) + Math.max(...ys)) / 2
    };
  }
  return null;
};
var getPinNumber = (pad) => {
  for (const hint of pad.port_hints ?? []) {
    const match = String(hint).trim().match(/^(?:pin)?(\d+)$/i);
    if (match) return Number.parseInt(match[1], 10);
  }
  return null;
};
var getCanonicalRowLocation = (pin1, pin2, tolerance) => {
  const dx = pin2.x - pin1.x;
  const dy = pin2.y - pin1.y;
  if (Math.abs(dy) <= tolerance && Math.abs(dx) > tolerance) {
    return dx > 0 ? "topside_left" : "bottomside_right";
  }
  if (Math.abs(dx) <= tolerance && Math.abs(dy) > tolerance) {
    return dy > 0 ? "leftside_bottom" : "rightside_top";
  }
  return null;
};
var pinMatchesLocation = (padCenters, pin1Center, pin1Location) => {
  const xs = padCenters.map((point) => point.x);
  const ys = padCenters.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const tolerance = Math.max(spanX, spanY, 1) * 1e-6;
  const { side, alignment } = PIN1_LOCATION_PARTS[pin1Location];
  const onRequestedSide = side === "leftside" && Math.abs(pin1Center.x - minX) <= tolerance || side === "rightside" && Math.abs(pin1Center.x - maxX) <= tolerance || side === "topside" && Math.abs(pin1Center.y - maxY) <= tolerance || side === "bottomside" && Math.abs(pin1Center.y - minY) <= tolerance;
  const atRequestedAlignment = alignment === "left" && (spanX <= tolerance || pin1Center.x < centerX - tolerance) || alignment === "right" && (spanX <= tolerance || pin1Center.x > centerX + tolerance) || alignment === "top" && (spanY <= tolerance || pin1Center.y > centerY + tolerance) || alignment === "bottom" && (spanY <= tolerance || pin1Center.y < centerY - tolerance);
  return onRequestedSide && atRequestedAlignment;
};
var analyzePcbPin1Location = (elements) => {
  const pads = elements.filter(
    (element) => element.type === "pcb_smtpad" || element.type === "pcb_plated_hole"
  );
  const numberedPads = pads.map((pad) => ({
    center: getPadCenter(pad),
    pinNumber: getPinNumber(pad)
  }));
  const pin1Center = numberedPads.find((pad) => pad.pinNumber === 1)?.center;
  const padCenters = numberedPads.map((pad) => pad.center).filter((point) => point !== null);
  if (!pin1Center || padCenters.length === 0) return null;
  const candidates = PIN1_LOCATIONS.filter(
    (pin1Location) => pinMatchesLocation(padCenters, pin1Center, pin1Location)
  );
  if (candidates.length === 1) return candidates[0];
  if (candidates.length === 0) return null;
  let nextNumberedPad;
  for (const pad of numberedPads) {
    if (!pad.center || pad.pinNumber === null || pad.pinNumber <= 1) continue;
    if (!nextNumberedPad || pad.pinNumber < nextNumberedPad.pinNumber) {
      nextNumberedPad = { center: pad.center, pinNumber: pad.pinNumber };
    }
  }
  if (!nextNumberedPad) return null;
  const xs = padCenters.map((point) => point.x);
  const ys = padCenters.map((point) => point.y);
  const span = Math.max(
    Math.max(...xs) - Math.min(...xs),
    Math.max(...ys) - Math.min(...ys),
    1
  );
  const tolerance = span * 1e-6;
  if (numberedPads.length === 2 && nextNumberedPad.pinNumber === 2) {
    return getCanonicalRowLocation(
      pin1Center,
      nextNumberedPad.center,
      tolerance
    );
  }
  if (numberedPads.length > 2) {
    const row = [...numberedPads].sort(
      (a, b) => (a.pinNumber ?? Number.POSITIVE_INFINITY) - (b.pinNumber ?? Number.POSITIVE_INFINITY)
    );
    if (row.every(
      ({ center, pinNumber }, index) => pinNumber === index + 1 && center !== null && Number.isFinite(center.x) && Number.isFinite(center.y)
    )) {
      const first = row[0].center;
      const last = row[row.length - 1].center;
      const dx = last.x - first.x;
      const dy = last.y - first.y;
      const horizontal = Math.abs(dy) <= tolerance && Math.abs(dx) > tolerance;
      const vertical = Math.abs(dx) <= tolerance && Math.abs(dy) > tolerance;
      if ((horizontal || vertical) && row.slice(1).every(({ center }, index) => {
        const previous = row[index].center;
        return horizontal ? Math.abs(center.y - first.y) <= tolerance && (center.x - previous.x) * Math.sign(dx) > tolerance : Math.abs(center.x - first.x) <= tolerance && (center.y - previous.y) * Math.sign(dy) > tolerance;
      })) {
        return getCanonicalRowLocation(first, row[1].center, tolerance);
      }
    }
  }
  const topologyCandidates = candidates.filter((pin1Location) => {
    const { side } = PIN1_LOCATION_PARTS[pin1Location];
    return side === "leftside" || side === "rightside" ? Math.abs(nextNumberedPad.center.x - pin1Center.x) <= tolerance : Math.abs(nextNumberedPad.center.y - pin1Center.y) <= tolerance;
  });
  return topologyCandidates.length === 1 ? topologyCandidates[0] : null;
};

// lib/categorize-error-or-warning.ts
var NETLIST_TYPES = /* @__PURE__ */ new Set([
  "source_pin_must_be_connected_error",
  "source_trace_not_connected_error"
]);
var PIN_SPECIFICATION_TYPES = /* @__PURE__ */ new Set([
  "source_component_pins_underspecified_warning",
  "source_no_power_pin_defined_warning",
  "source_no_ground_pin_defined_warning"
]);
var PLACEMENT_TYPES = /* @__PURE__ */ new Set([
  "pcb_placement_error",
  "pcb_component_outside_board_error",
  "pcb_courtyard_overlap_error",
  "pcb_footprint_overlap_error",
  "pcb_connector_not_in_accessible_orientation_warning"
]);
var ROUTING_TYPES = /* @__PURE__ */ new Set([
  "pcb_port_not_connected_error",
  "pcb_trace_missing_error",
  "pcb_trace_error",
  "pcb_via_clearance_error"
]);
var SOURCE_TYPES = /* @__PURE__ */ new Set(["source_property_ignored_warning"]);
var categorizeErrorOrWarning = (value) => {
  const drcType = typeof value === "string" ? value : value.error_type ?? value.warning_type ?? value.type;
  if (!drcType) return "unknown";
  if (NETLIST_TYPES.has(drcType)) return "netlist";
  if (PIN_SPECIFICATION_TYPES.has(drcType)) return "pin_specification";
  if (PLACEMENT_TYPES.has(drcType)) return "placement";
  if (ROUTING_TYPES.has(drcType)) return "routing";
  if (SOURCE_TYPES.has(drcType)) return "source";
  return "unknown";
};

// lib/copper-geometry.ts
import {
  Arc,
  Box,
  Circle,
  Matrix,
  ORIENTATION,
  Point,
  Polygon,
  Segment
} from "@flatten-js/core";
import { compose as compose2, rotate, translate as translate5 } from "transformation-matrix";
var placePolygon = (polygon, center, degrees = 0) => {
  const { a, b, c, d, e, f } = compose2(
    translate5(center.x, center.y),
    rotate(degrees * Math.PI / 180)
  );
  return polygon.transform(new Matrix(a, b, c, d, e, f));
};
var ccw = (polygon) => polygon.orientation() === ORIENTATION.CCW ? polygon : polygon.reverse();
var circlePolygon = (center, radius) => ccw(new Polygon(new Circle(new Point(center.x, center.y), radius)));
var roundedRectangle = (center, width, height, radius = 0, degrees = 0) => {
  const x = width / 2;
  const y = height / 2;
  const r = Math.max(0, Math.min(radius, x, y));
  if (r === 0)
    return placePolygon(
      ccw(new Polygon(new Box(-x, -y, x, y))),
      center,
      degrees
    );
  const arcs = [
    new Arc(new Point(x - r, -y + r), r, -Math.PI / 2, 0, true),
    new Arc(new Point(x - r, y - r), r, 0, Math.PI / 2, true),
    new Arc(new Point(-x + r, y - r), r, Math.PI / 2, Math.PI, true),
    new Arc(new Point(-x + r, -y + r), r, Math.PI, Math.PI * 1.5, true)
  ];
  const edges = [];
  for (let i = 0; i < arcs.length; i++) {
    const arc = arcs[i];
    const next = arcs[(i + 1) % arcs.length];
    edges.push(arc);
    if (arc.end.distanceTo(next.start)[0] > 1e-12)
      edges.push(new Segment(arc.end, next.start));
  }
  return placePolygon(ccw(new Polygon(edges)), center, degrees);
};
var ringPolygon = (ring) => {
  const edges = [];
  for (let i = 0; i < ring.vertices.length; i++) {
    const start = ring.vertices[i];
    const end = ring.vertices[(i + 1) % ring.vertices.length];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    if (dx === 0 && dy === 0) continue;
    const bulge = start.bulge ?? 0;
    if (bulge === 0) {
      edges.push(
        new Segment(new Point(start.x, start.y), new Point(end.x, end.y))
      );
    } else {
      const offset = (1 - bulge * bulge) / (4 * bulge);
      const center = new Point(
        (start.x + end.x) / 2 - dy * offset,
        (start.y + end.y) / 2 + dx * offset
      );
      edges.push(
        new Arc(
          center,
          Math.hypot(dx, dy) * (1 + bulge * bulge) / (4 * Math.abs(bulge)),
          Math.atan2(start.y - center.y, start.x - center.x),
          Math.atan2(end.y - center.y, end.x - center.x),
          bulge > 0
        )
      );
    }
  }
  return ccw(new Polygon(edges));
};
var subtractHole = (outer, hole) => {
  for (const face of hole.reverse().faces) outer.addFace(face.shapes);
  return outer;
};
var getPourPolygon = (pour) => {
  if (pour.shape === "rect")
    return roundedRectangle(
      pour.center,
      pour.width,
      pour.height,
      0,
      pour.rotation
    );
  if (pour.shape === "polygon")
    return ccw(new Polygon(pour.points.map((p) => new Point(p.x, p.y))));
  const polygon = ringPolygon(pour.brep_shape.outer_ring);
  for (const ring of pour.brep_shape.inner_rings)
    subtractHole(polygon, ringPolygon(ring));
  return polygon;
};
var getSmtPadPolygon = (pad) => {
  if (pad.shape === "polygon")
    return ccw(new Polygon(pad.points.map((p) => new Point(p.x, p.y))));
  if (pad.shape === "circle") return circlePolygon(pad, pad.radius);
  const radius = pad.shape === "pill" || pad.shape === "rotated_pill" ? pad.radius : pad.corner_radius ?? pad.rect_border_radius ?? 0;
  return roundedRectangle(
    pad,
    pad.width,
    pad.height,
    radius,
    "ccw_rotation" in pad ? pad.ccw_rotation : 0
  );
};
var getViaPolygon = (center, outerDiameter, holeDiameter) => subtractHole(
  circlePolygon(center, outerDiameter / 2),
  circlePolygon(center, holeDiameter / 2)
);
var getPlatedHolePolygon = (pad, componentRotation = 0) => {
  if (pad.shape === "circle")
    return getViaPolygon(pad, pad.outer_diameter, pad.hole_diameter);
  if ("outer_width" in pad) {
    return subtractHole(
      roundedRectangle(
        pad,
        pad.outer_width,
        pad.outer_height,
        Math.min(pad.outer_width, pad.outer_height) / 2,
        pad.ccw_rotation
      ),
      roundedRectangle(
        pad,
        pad.hole_width,
        pad.hole_height,
        Math.min(pad.hole_width, pad.hole_height) / 2,
        pad.ccw_rotation
      )
    );
  }
  const center = { x: pad.x + pad.hole_offset_x, y: pad.y + pad.hole_offset_y };
  const outer = pad.shape === "hole_with_polygon_pad" ? placePolygon(
    ccw(new Polygon(pad.pad_outline.map((p) => new Point(p.x, p.y)))),
    pad,
    pad.ccw_rotation ?? componentRotation
  ) : roundedRectangle(
    pad,
    pad.rect_pad_width,
    pad.rect_pad_height,
    pad.rect_border_radius,
    "rect_ccw_rotation" in pad ? pad.rect_ccw_rotation : 0
  );
  if (pad.shape === "circular_hole_with_rect_pad" || pad.shape === "hole_with_polygon_pad" && pad.hole_shape === "circle") {
    if (pad.hole_diameter === void 0)
      throw new Error("Circular plated hole requires hole_diameter");
    return subtractHole(outer, circlePolygon(center, pad.hole_diameter / 2));
  }
  if (!("hole_width" in pad) || pad.hole_width === void 0 || pad.hole_height === void 0)
    throw new Error("Slotted plated hole requires hole_width and hole_height");
  return subtractHole(
    outer,
    roundedRectangle(
      center,
      pad.hole_width,
      pad.hole_height,
      Math.min(pad.hole_width, pad.hole_height) / 2,
      "hole_ccw_rotation" in pad ? pad.hole_ccw_rotation : pad.shape === "hole_with_polygon_pad" ? pad.ccw_rotation ?? componentRotation : 0
    )
  );
};
var getTraceSegmentPolygon = (start, end, startWidth, endWidth = startWidth) => {
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  const r1 = startWidth / 2;
  const r2 = endWidth / 2;
  if (length <= Math.abs(r2 - r1))
    return circlePolygon(r1 >= r2 ? start : end, Math.max(r1, r2));
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const tangent = Math.acos((r1 - r2) / length);
  const first = new Arc(
    new Point(start.x, start.y),
    r1,
    angle + tangent,
    angle - tangent,
    true
  );
  const second = new Arc(
    new Point(end.x, end.y),
    r2,
    angle - tangent,
    angle + tangent,
    true
  );
  return ccw(
    new Polygon([
      first,
      new Segment(first.end, second.start),
      second,
      new Segment(second.end, first.start)
    ])
  );
};
var copperPolygonsTouch = (a, b, tolerance = 1e-7) => a.vertices.some((p) => b.contains(p)) || b.vertices.some((p) => a.contains(p)) || a.distanceTo(b)[0] <= tolerance;
export {
  analyzePcbPin1Location,
  applySelector,
  applySelectorAST,
  buildSubtree,
  categorizeErrorOrWarning,
  circlePolygon,
  cju_default as cju,
  cju_indexed_default as cjuIndexed,
  computeClearanceBetweenElements,
  computeGapBetweenCopper,
  copperPolygonsTouch,
  createBoardOwnerMap,
  directionToVec,
  distanceBetweenCircleAndCircle,
  distanceBetweenCircleAndPolygon,
  distanceBetweenPolygonAndPolygon,
  distanceBetweenShapes,
  findBoundsAndCenter,
  getBoardBounds,
  getBoundsOfPcbElements,
  getCircuitJsonTree,
  getElementById,
  getElementId,
  getElementRenderLayers,
  getMinimumFlexContainer,
  getPcbElementBounds,
  getPcbElementsWithinBounds,
  getPlatedHolePolygon,
  getPourPolygon,
  getPrimaryId,
  getReadableNameForElement,
  getReadableNameForPcbPort,
  getReadableNameForPcbSmtpad,
  getReadableNameForPcbTrace,
  getSchematicElementBounds,
  getSmtPadPolygon,
  getStringFromCircuitJsonTree,
  getTraceSegmentPolygon,
  getViaPolygon,
  oppositeDirection,
  oppositeSide,
  placePolygon,
  repositionPcbComponentTo,
  repositionPcbGroupTo,
  repositionSchematicComponentTo,
  repositionSchematicGroupTo,
  rotateClockwise,
  rotateCounterClockwise,
  rotateDirection,
  roundedRectangle,
  su,
  transformInsertionDirection,
  transformPCBElement,
  transformPCBElements,
  transformPCBElement as transformPcbElement,
  transformPCBElements as transformPcbElements,
  transformSchematicElement,
  transformSchematicElements,
  vecToDirection
};
//# sourceMappingURL=index.js.map