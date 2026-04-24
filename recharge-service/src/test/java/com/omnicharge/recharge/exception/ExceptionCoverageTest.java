package com.omnicharge.recharge.exception;

import com.omnicharge.common.exception.BadRequestException;
import com.omnicharge.common.exception.ResourceNotFoundException;
import com.omnicharge.common.exception.UnauthorizedException;
import com.omnicharge.common.exception.DuplicateResourceException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ExceptionCoverageTest {

    @Test
    void testExceptions() {
        BadRequestException br = new BadRequestException("bad");
        assertEquals("bad", br.getMessage());

        ResourceNotFoundException rnf = new ResourceNotFoundException("not found");
        assertEquals("not found", rnf.getMessage());

        UnauthorizedException ue = new UnauthorizedException("no");
        assertEquals("no", ue.getMessage());

        DuplicateResourceException dre = new DuplicateResourceException("duplicate");
        assertEquals("duplicate", dre.getMessage());
    }
}
