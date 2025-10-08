'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.EngineerType =
  exports.TerritoryType =
  exports.OrderStatusLabel =
  exports.OrderStatus =
    void 0;
var OrderStatus;
(function (OrderStatus) {
  OrderStatus['WAITING'] = 'waiting';
  OrderStatus['PROCESSING'] = 'processing';
  OrderStatus['WORKING'] = 'working';
  OrderStatus['REVIEW'] = 'review';
  OrderStatus['COMPLETED'] = 'completed';
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
var OrderStatusLabel;
(function (OrderStatusLabel) {
  OrderStatusLabel['WAITING'] = 'Waiting';
  OrderStatusLabel['PROCESSING'] = 'Processing';
  OrderStatusLabel['WORKING'] = 'In Progress';
  OrderStatusLabel['REVIEW'] = 'Under Review';
  OrderStatusLabel['COMPLETED'] = 'Completed';
})(OrderStatusLabel || (exports.OrderStatusLabel = OrderStatusLabel = {}));
var TerritoryType;
(function (TerritoryType) {
  TerritoryType['URBAN'] = 'urban';
  TerritoryType['SUBURBAN'] = 'suburban';
  TerritoryType['RURAL'] = 'rural';
  TerritoryType['HOME'] = 'home';
  TerritoryType['ZONE_1'] = 'zone_1';
  TerritoryType['ZONE_2'] = 'zone_2';
  TerritoryType['ZONE_3'] = 'zone_3';
})(TerritoryType || (exports.TerritoryType = TerritoryType = {}));
var EngineerType;
(function (EngineerType) {
  EngineerType['STAFF'] = 'staff';
  EngineerType['REMOTE'] = 'remote';
  EngineerType['CONTRACT'] = 'contract';
})(EngineerType || (exports.EngineerType = EngineerType = {}));
//# sourceMappingURL=order.interface.js.map
