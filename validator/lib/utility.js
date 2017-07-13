'use strict';
var Cesium = require('cesium');

var Cartesian3 = Cesium.Cartesian3;
var Matrix3 = Cesium.Matrix3;
var Matrix4 = Cesium.Matrix4;

module.exports = {
    typeToComponentsLength : typeToComponentsLength,
    componentTypeToByteLength : componentTypeToByteLength,
    isBufferValidUtf8 : isBufferValidUtf8,
    regionInsideRegion : regionInsideRegion,
    sphereInsideSphere : sphereInsideSphere,
    boxInsideBox : boxInsideBox
};

function typeToComponentsLength(type) {
    switch (type) {
        case 'SCALAR':
            return 1;
        case 'VEC2':
            return 2;
        case 'VEC3':
            return 3;
        case 'VEC4':
            return 4;
        default:
            return undefined;
    }
}

function componentTypeToByteLength(componentType) {
    switch (componentType) {
        case 'BYTE':
        case 'UNSIGNED_BYTE':
            return 1;
        case 'SHORT':
        case 'UNSIGNED_SHORT':
            return 2;
        case 'INT':
        case 'UNSIGNED_INT':
        case 'FLOAT':
            return 4;
        case 'DOUBLE':
            return 8;
        default:
            return undefined;
    }
}

function isBufferValidUtf8(buffer){
    return Buffer.compare(Buffer.from(buffer.toString()), buffer) === 0;
}

function regionInsideRegion(regionInner, regionOuter) {
    return (regionInner[0] >= regionOuter[0]) &&
        (regionInner[1] >= regionOuter[1]) &&
        (regionInner[2] <= regionOuter[2]) &&
        (regionInner[3] <= regionOuter[3]) &&
        (regionInner[4] >= regionOuter[4]) &&
        (regionInner[5] <= regionOuter[5]);
}

var scratchInnerCenter = new Cartesian3();
var scratchOuterCenter = new Cartesian3();

function sphereInsideSphere(sphereInner, sphereOuter) {
    var radiusInner= sphereInner[3];
    var radiusOuter = sphereOuter[3];
    var centerInner = Cartesian3.unpack(sphereInner, 0, scratchInnerCenter);
    var centerOuter = Cartesian3.unpack(sphereOuter, 0, scratchOuterCenter);
    var distance = Cartesian3.distance(centerInner, centerOuter);
    return distance <= (radiusOuter - radiusInner);
}

var scratchInnerHalfAxes = new Matrix3();
var scratchOuterHalfAxes = new Matrix3();

function boxInsideBox(boxInner, boxOuter) {
    // Compute inner box..
    var centerInner = Cartesian3.fromElements(boxInner[0], boxInner[1], boxInner[2], scratchInnerCenter);
    var halfAxesInner = Matrix3.fromArray(boxInner, 3, scratchInnerHalfAxes);
    var transformInner = Matrix4.fromRotationTranslation(halfAxesInner,centerInner);

    // Compute outer box..
    var centerOuter = Cartesian3.fromElements(boxOuter[0], boxOuter[1], boxOuter[2], scratchOuterCenter);
    var halfAxesOuter = Matrix3.fromArray(boxOuter, 3, scratchOuterHalfAxes);
    var transformOuter = Matrix4.fromRotationTranslation(halfAxesOuter,centerOuter);

    // Create a unit cube 0,0,0 to 1,1,1..
    var cube = new Array(8);
    cube[0] = new Cartesian3(0, 0, 0);
    cube[1] = new Cartesian3(0, 0, 1);
    cube[2] = new Cartesian3(1, 0, 1);
    cube[3] = new Cartesian3(1, 0, 0);
    cube[4] = new Cartesian3(0, 1, 0);
    cube[5] = new Cartesian3(0, 1, 1);
    cube[6] = new Cartesian3(1, 1, 1);
    cube[7] = new Cartesian3(1, 1, 0);

    // TRANSFORM BY transformInner - TO GET THE INNER BOUNDING BOX IN WORLD SPACE
    var i = 0;
    for (i = 0; i < 8; i++) {
        cube[i] = Matrix4.multiplyByPoint(transformInner,cube[i],cube[i]);
    }

    // TRANSFORM BY INVERSE OF transformOuter - TO GET THE BOX IN THE OUTER BOX'S SPACE
    var transformInnerInverse = Matrix4.inverse(transformOuter,transformOuter);
    for (i = 0; i < 8; i++) {
        cube[i] = Matrix4.multiplyByPoint(transformInnerInverse,cube[i],cube[i]);
    }

    // COMPARE THE RESULTING CUBE WITH UNIT CUBE..
    for (i = 0; i < 8; i++) {
        if (cube[i].x < 0 || cube[i].x > 1 || cube[i].y < 0 || cube[i].y > 1 || cube[i].z < 0 || cube[i].z > 1) {
            return false;
        }
    }
    return true;
}
